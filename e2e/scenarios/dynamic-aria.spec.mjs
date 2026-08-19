import { test, expect } from '@playwright/test'
import { saveSnapshot } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

for (const t of targets) {
  test(`dynamic aria — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)
    const toggle = page.getByRole('button', { name: 'コンパイル結果の詳細' })

    // ① 閉じている状態
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    const collapsed = await page.locator('#app').ariaSnapshot()

    // ② 開く → 属性の反映を待ってから取得
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const expanded = await page.locator('#app').ariaSnapshot()

    saveSnapshot(t.name, 'dynamic-aria', { collapsed, expanded })
  })
}
