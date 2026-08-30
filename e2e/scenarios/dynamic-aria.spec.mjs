import { test, expect } from '@playwright/test'
import { saveSnapshot, snapshotAttributes } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

/**
 * aria-expanded は ariaSnapshot に `[expanded]` として出るが、
 * **aria-controls は出力に現れない**。ボタンとパネルの関連付けが
 * 比較対象から抜け落ちるため、属性を別時点として保存する。
 */
const TOGGLE_ATTRIBUTES = ['aria-expanded', 'aria-controls']

for (const t of targets) {
  test(`dynamic aria — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)
    const toggle = page.getByRole('button', { name: 'Vapor モードとは何ですか？' })

    // ① 閉じている状態
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    const collapsed = await page.locator('#app').ariaSnapshot()
    const collapsedAttrs = await snapshotAttributes(toggle, TOGGLE_ATTRIBUTES)

    // ② 開く → 属性の反映を待ってから取得
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const expanded = await page.locator('#app').ariaSnapshot()
    const expandedAttrs = await snapshotAttributes(toggle, TOGGLE_ATTRIBUTES)

    saveSnapshot(t.name, 'dynamic-aria', {
      collapsed,
      expanded,
      'collapsed-attrs': collapsedAttrs,
      'expanded-attrs': expandedAttrs,
    })
  })
}
