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
  /**
   * webServer は**配信するだけ**。ビルドと検証は package.json の test:e2e が
   * `playwright test` の前段で済ませている。
   *
   * 以前はここで lane ごとに
   * `build:{lane} && build:ssr:{lane} && prerender {lane} && preview:{lane}`
   * を走らせていた。これには穴が2つあった。
   *
   * 1. `pnpm run check` は build → verify → test:e2e の順に進むのに、
   *    webServer が dist を作り直すため **E2E が観測するのは verify を
   *    通していない世代**だった。test:e2e 単独ではガードが一度も走らない。
   * 2. scripts/prerender.mjs は lane を渡されると lane 間ハッシュ照合を
   *    明示的にスキップする。**E2E が配信を受ける ssr.html は
   *    「サーバ側は両 lane で同一」の確認を通っていなかった。**
   *    SSR カテゴリはこの前提の上で「差が出たら hydration のせい」と
   *    結論づけるので、前提が未確認だとサーバ描画の食い違いを
   *    Vapor 起因と読み違える余地が残る。
   *
   * globalSetup へ移す案は採らない。**実測すると webServer のほうが
   * globalSetup より先に起動する**ため、preview が古い dist を掴んだまま
   * 立ち上がってしまう。npm script の前段なら順序が確実に決まる。
   */
  webServer: Object.keys(LANES).map((lane) => ({
    command: `pnpm run preview:${lane}`,
    port: LANES[lane].previewPort,
    reuseExistingServer: false,
  })),
  use: { headless: true },
})
