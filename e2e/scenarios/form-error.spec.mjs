import { test, expect } from '@playwright/test'
import { saveSnapshot } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

for (const t of targets) {
  test(`form error — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)
    const field = page.getByLabel('メールアドレス')
    const submit = page.getByRole('button', { name: '送信' })
    const alert = page.getByRole('alert')

    // ① 未送信の状態
    const pristine = await page.locator('#app').ariaSnapshot()

    // ② 不正な値で送信 → エラー表示の確定を待ってから取得
    await field.fill('not-an-email')
    await submit.click()
    await expect(alert).toBeVisible()
    await expect(field).toHaveAttribute('aria-describedby', 'email-error')
    const invalid = await page.locator('#app').ariaSnapshot()

    // ③ 正しい値に直す → エラー解除の確定を待ってから取得
    await field.fill('user@example.com')
    await expect(alert).toBeHidden()
    await expect(field).not.toHaveAttribute('aria-describedby', 'email-error')
    const recovered = await page.locator('#app').ariaSnapshot()

    saveSnapshot(t.name, 'form-error', { pristine, invalid, recovered })
  })
}
