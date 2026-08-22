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
    server: { port: lane.devPort },
    build: { outDir: 'dist' },
  })
}
