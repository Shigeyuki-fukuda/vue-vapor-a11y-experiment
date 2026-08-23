import { test, expect } from '@playwright/test'
import { saveSnapshot } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

for (const t of targets) {
  test(`transition alert — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)
    const toggle = page.getByRole('button', { name: /警告を(出す|閉じる)/ })
    const alert = page.getByRole('alert')

    // ① 初期状態 — alert なし
    await expect(alert).toHaveCount(0)
    const initial = await page.locator('#app').ariaSnapshot()

    // ② 表示 — 入場アニメーションの完了まで待つ。
    //    待たずに取ると「取得タイミング由来」の差分がノイズとして出る。
    //    完了の判定にクラスを使うのは、待ち時間を実装依存にしないため
    await toggle.click()
    await expect(alert).toBeVisible()
    await expect(alert).not.toHaveClass(/alert-enter-active/)
    const shown = await page.locator('#app').ariaSnapshot()

    // ③ 退場アニメーションの最中 — このシナリオの本題。
    //    v-if は false になっているが要素はまだ DOM にいる。
    //    この間 alert がツリーに残るかどうかが観測対象で、
    //    残れば支援技術には「閉じたはずの警告がまだある」と伝わる
    await toggle.click()
    await expect(alert).toHaveClass(/alert-leave-active/)
    const leaving = await page.locator('#app').ariaSnapshot()

    // ④ 退場完了 — 要素が DOM から消える
    await expect(alert).toHaveCount(0)
    const gone = await page.locator('#app').ariaSnapshot()

    saveSnapshot(t.name, 'transition-alert', {
      initial,
      shown,
      leaving,
      gone,
    })
  })
}
