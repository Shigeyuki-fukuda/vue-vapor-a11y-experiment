import { test, expect } from '@playwright/test'
import { saveSnapshot, snapshotAttributes } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

/**
 * ariaSnapshot は開いたダイアログを `dialog "表示設定"` として出すが、
 * **aria-modal は出力に現れない**。「モーダルであること」自体が比較対象から
 * 抜け落ちるため、属性を別時点として保存する。
 */
const DIALOG_ATTRIBUTES = ['aria-modal', 'aria-labelledby', 'tabindex']

for (const t of targets) {
  test(`focus management — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)
    const opener = page.getByRole('button', { name: '設定を開く' })
    const dialog = page.getByRole('dialog')

    // ① 初期状態のアクセシビリティツリー
    const initial = await page.locator('#app').ariaSnapshot()

    // ② 開く → 描画とフォーカス移動の完了を待ってから取得
    await opener.click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toBeFocused()
    const opened = await page.locator('#app').ariaSnapshot()
    const focusOpened = await page.locator(':focus').ariaSnapshot()
    const openedAttrs = await snapshotAttributes(dialog, DIALOG_ATTRIBUTES)

    // ③ 閉じる → 消滅とフォーカス復帰の完了を待ってから取得
    await page.getByRole('button', { name: '閉じる' }).click()
    await expect(dialog).toBeHidden()
    await expect(opener).toBeFocused()
    const closed = await page.locator('#app').ariaSnapshot()
    const focusClosed = await page.locator(':focus').ariaSnapshot()

    // ariaSnapshot はフォーカス位置を持たないため、フォーカス中の要素の
    // アクセシビリティ表現を別時点として保存し、これも差分比較の対象にする
    saveSnapshot(t.name, 'focus-management', {
      initial,
      opened,
      closed,
      'focus-opened': focusOpened,
      'focus-closed': focusClosed,
      'opened-attrs': openedAttrs,
    })
  })
}
