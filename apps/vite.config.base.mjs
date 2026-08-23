import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { getLane } from '../scripts/lanes.mjs'

/**
 * 両 lane の Vite 設定を1つのファクトリから生成する。
 *
 * こうしておくと「classic と vapor の設定差分は vapor フラグだけ」が
 * 設計として保証される。設定ファイルを2つ手で書き分けていると、
 * 片方だけに加えた変更が差分の原因になり得てしまう。
 *
 * `features.vapor` は @vitejs/plugin-vue のプラグインレベル強制スイッチで、
 * `<script setup>` を持つ全 SFC を Vapor モードでコンパイルさせる。
 * SFC 側に `vapor` 属性を書く必要がないため、ソースを両 lane で
 * 完全同一に保てる。
 */
export function createLaneConfig(name) {
  const lane = getLane(name)
  return defineConfig({
    root: `apps/${name}`,
    plugins: [vue({ features: { vapor: lane.vapor } })],
    // strictPort は必須。Vite は既定でポートが埋まっていると別のポートへ
    // 逃げるが、この実験ではポート番号が lane の識別子そのものになっている。
    // 4174 が埋まっていて vapor が 4175 で起動すると、4173 に残った classic を
    // 相手に「classic 同士」を比較してしまう。それでも VoiceOver は何も言わずに
    // 読み上げるため、読み上げ検証では事故に気付けない。
    server: { port: lane.devPort, strictPort: true },
    preview: { port: lane.previewPort, strictPort: true },
    build: {
      outDir: 'dist',
      rollupOptions: {
        /**
         * ページを2つ持つ。
         *
         * - index.html — クライアントだけで描画する既存のページ
         * - ssr.html   — サーバが描いた HTML を hydration するページ
         *
         * 同じ lane に並べているのは、両者の違いを「hydration の有無」だけに
         * 保つため。別 lane に切り出すとポートと設定が増え、差分の原因を
         * 絞り込めなくなる。
         *
         * なお `--ssr` を付けたビルド (build:ssr) では Vite がこの input を
         * 使わず、CLI で渡したサーバエントリを入口にする。
         */
        input: {
          index: resolve(import.meta.dirname, name, 'index.html'),
          ssr: resolve(import.meta.dirname, name, 'ssr.html'),
        },
      },
    },
  })
}
