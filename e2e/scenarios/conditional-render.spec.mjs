import { test, expect } from '@playwright/test'
import { saveSnapshot } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

for (const t of targets) {
  test(`conditional render — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)
    // v-if 側 / v-show 側の順に並んでいる。文面で区別しているので、
    // ConditionalBlocks.vue の文言を変えるときはここも合わせる
    const toggle = page.getByRole('checkbox', { name: '入力のヒントを表示する' })
    const ifBlock = page.getByText('ユーザー ID は半角英数字で入力してください。')
    const showBlock = page.getByText('記号は - と _ だけ使えます。')

    // ① 両方とも非表示
    await expect(ifBlock).toBeHidden()
    await expect(showBlock).toBeHidden()
    const hidden = await page.locator('#app').ariaSnapshot()

    // ② 表示 → 両方の描画完了を待ってから取得
    await toggle.click()
    await expect(ifBlock).toBeVisible()
    await expect(showBlock).toBeVisible()
    const shown = await page.locator('#app').ariaSnapshot()

    // ③ 再度隠す → ツリーから抜けたことを確認してから取得
    await toggle.click()
    await expect(ifBlock).toBeHidden()
    await expect(showBlock).toBeHidden()
    const hiddenAgain = await page.locator('#app').ariaSnapshot()

    saveSnapshot(t.name, 'conditional-render', {
      hidden,
      shown,
      'hidden-again': hiddenAgain,
    })
  })
}
