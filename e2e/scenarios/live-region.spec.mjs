import { test, expect } from '@playwright/test'
import { saveSnapshot } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

for (const t of targets) {
  test(`live region — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)

    // ① 初期状態のアクセシビリティツリー
    const before = await page.locator('#app').ariaSnapshot()

    // ② 操作 → 反映待ち
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.getByRole('status')).toHaveText('保存しました')

    // ③ 操作後のツリー
    const after = await page.locator('#app').ariaSnapshot()
    saveSnapshot(t.name, 'live-region', { before, after })
  })
}
