import { defineConfig } from '@playwright/test'
import { LANES } from './scripts/lanes.mjs'

/**
 * プレビューのポートは scripts/lanes.mjs の値をそのまま使う。
 * ここに番号を書き写すと lane とポートの対応が2箇所に分かれ、
 * 「4174 に classic が立っている」状態を作れてしまう。
 *
 * 起動は package.json の preview:{lane} を呼ぶ。--port を渡さないのは
 * ポート指定を vite.config 側 (strictPort 付き) に寄せているため。
 *
 * reuseExistingServer は false。VoiceOver 検証のために
 * pnpm run preview:{lane} を立てたまま E2E を回すことが実際に起きるが、
 * その既存サーバが古い成果物を配信していても Playwright は気付かず
 * 「差分 0 件」を出してしまう。再利用せず strictPort で衝突させて
 * 落とすほうが安全 (対処は docs/troubleshooting.md)。
 */
export default defineConfig({
  testDir: 'e2e/scenarios',
  /**
   * 既定の reporter は CI で 'dot'、ローカルで 'list' (html は含まれない)。
   * html を明示しないと playwright-report/ が生成されないため、
   * ワークフローの失敗時 artifact が中身ゼロのまま誰にも気付かれない。
   * ローカルの出力は今までどおり list。
   */
  reporter: process.env.CI ? [['html', { open: 'never' }], ['dot']] : 'list',
  webServer: Object.keys(LANES).map((lane) => ({
    // ssr.html を配信するには SSR ビルドと prerender まで通す必要がある。
    // prerender を飛ばすと #app が空のまま配信され、hydration ではなく
    // 通常のクライアント描画を見ることになる (それでも E2E は通ってしまう)。
    //
    // prerender に lane を渡すのは、2つの webServer が並行して立ち上がり、
    // 相手の dist-server がまだ無い状態で読みにいくのを避けるため。
    // lane 間の HTML 一致は `pnpm run build` 側で確認している。
    command:
      `pnpm run build:${lane} && pnpm run build:ssr:${lane} && ` +
      `pnpm run prerender ${lane} && pnpm run preview:${lane}`,
    port: LANES[lane].previewPort,
    reuseExistingServer: false,
  })),
  use: { headless: true },
})
