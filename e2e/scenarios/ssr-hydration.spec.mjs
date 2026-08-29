import { test, expect } from '@playwright/test'
import { saveSnapshot } from '../helpers/snapshot.mjs'

// このシナリオだけ /ssr.html を見る。他は index.html (クライアント描画)。
const targets = [
  { name: 'classic', url: 'http://localhost:4173/ssr.html' },
  { name: 'vapor',   url: 'http://localhost:4174/ssr.html' },
]

/**
 * hydration の前後でアクセシビリティツリーを撮る。
 *
 * サーバが吐く HTML は両 lane で同一 (scripts/prerender.mjs が毎回確認)。
 * したがって hydration 後に差が出れば、原因は createSSRApp と
 * createVaporSSRApp の実装差以外にありえない。
 *
 * hydration 前の状態は **JavaScript を切ったコンテキスト**で撮る。
 * 「hydration が終わる前に急いで撮る」方式にすると、撮れたかどうかが
 * 実行速度に左右され、記録が信用できなくなる。JS を切ればサーバが描いた
 * DOM がそのまま残り、毎回同じものが撮れる。
 */
for (const t of targets) {
  test(`ssr hydration — ${t.name}`, async ({ browser }) => {
    // ① hydration 前 — サーバが描いた DOM そのもの
    const staticContext = await browser.newContext({ javaScriptEnabled: false })
    const staticPage = await staticContext.newPage()
    await staticPage.goto(t.url)

    // #app が空なら prerender が効いておらず、hydration ではなく
    // クライアント描画を見ていることになる。空振りをここで止める
    const heading = staticPage.getByRole('heading', { name: 'Vue Vapor A11y Experiment' })
    await expect(heading).toBeVisible()

    const server = await staticPage.locator('#app').ariaSnapshot()
    await staticContext.close()

    // ② hydration 後
    const context = await browser.newContext()
    const page = await context.newPage()

    // hydration mismatch は警告が出るだけでテストは落ちない。
    // 拾わないと「ツリーは一致しているが警告は出ている」状態を見逃す
    const warnings = []
    page.on('console', (message) => {
      const text = message.text()
      if (/hydrat/i.test(text)) warnings.push(`[${message.type()}] ${text}`)
    })
    page.on('pageerror', (error) => warnings.push(`[pageerror] ${error.message}`))

    await page.goto(t.url)

    // hydration の完了を待つ。サーバの HTML にイベントは載っていないので、
    // 押して反応があればクライアント側の処理が繋がったと判断できる。
    // ここが動かなければ hydration そのものが失敗している
    const toggle = page.getByRole('button', { name: '補足を切り替え' })
    const ifBlock = page.getByText('v-if で出し入れされる補足')
    await toggle.click()
    await expect(ifBlock).toBeVisible()
    await toggle.click()
    await expect(ifBlock).toBeHidden()

    const hydrated = await page.locator('#app').ariaSnapshot()
    await context.close()

    saveSnapshot(t.name, 'ssr-hydration', {
      server,
      hydrated,
      // 警告も時点として保存する。0件を要求しないのは、両 lane で等しく出る
      // mismatch がありうるため (README「SSR / hydration」)。以前は Teleport の
      // 注入漏れによる警告が出ていたが、現在は 0 件。
      //
      // ここで見たいのは「警告が無いこと」ではなく「lane 間で同じかどうか」。
      // スナップショットにしておけば diff-snapshots が lane 間を突き合わせ、
      // vapor だけ warn が増えれば差分として落ちる。新種の警告が両 lane に
      // 出た場合も、コミット済みの内容と変わるので CI のドリフト検査が捕まえる。
      warnings: warnings.length > 0 ? warnings.sort().join('\n') : '(警告なし)',
    })
  })
}
