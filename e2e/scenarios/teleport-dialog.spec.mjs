import { test, expect } from '@playwright/test'
import { saveSnapshot, snapshotAttributes } from '../helpers/snapshot.mjs'
import { TARGETS, openLane } from '../helpers/targets.mjs'

/** aria-modal は ariaSnapshot の出力に現れないため別時点として保存する */
const DIALOG_ATTRIBUTES = ['aria-modal', 'aria-labelledby', 'tabindex']

for (const t of TARGETS) {
  test(`teleport dialog — ${t.name}`, async ({ page }) => {
    await openLane(page, t)
    const opener = page.getByRole('button', { name: '通知パネルを開く' })
    const dialog = page.getByRole('dialog', { name: '通知パネル' })
    const closer = page.getByRole('button', { name: '閉じる' })

    // ① 閉じている状態
    await expect(dialog).toHaveCount(0)
    const closed = await page.locator('body').ariaSnapshot()

    // ② 開く — ダイアログは body 直下へ移る
    await opener.click()
    await expect(dialog).toBeVisible()

    // 移動先が #app の外であることを、ツリーではなく DOM の親子で直接確かめる。
    // ここを確認しないと「Teleport が効かず #app 内に描画された」場合でも
    // body のスナップショットは同じに見えてしまい、シナリオが空振りする
    const parentIsBody = await dialog.evaluate((el) => el.parentElement === document.body)
    expect(parentIsBody).toBe(true)

    // 移動元 (#app) と移動先 (body) の両方を記録する。
    // #app 側にダイアログが残っていないことも比較対象になる
    const openedApp = await page.locator('#app').ariaSnapshot()
    const opened = await page.locator('body').ariaSnapshot()
    const openedAttrs = await snapshotAttributes(dialog, DIALOG_ATTRIBUTES)

    // template ref が移動後の要素を指しているか。繋がっていなければ
    // フォーカスは body に残り、この時点が classic と食い違う
    const focusOpened = await page.locator(':focus').ariaSnapshot()

    // ③ Tab がダイアログの外へ出ないこと。
    //
    // トラップは dialogRef 越しに要素を探すので、ref が移動後の要素を
    // 指していなければ無言で効かなくなる。項目2 (FocusDialog) と同じ
    // assert を置くことで、両者の違いを Teleport の有無だけに保つ。
    await page.keyboard.press('Tab')
    await expect(closer).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(closer).toBeFocused()
    const focusTrapped = await page.locator(':focus').ariaSnapshot()

    // ④ 閉じる — フォーカスが開くボタンへ戻る
    await closer.click()
    await expect(dialog).toHaveCount(0)
    const focusClosed = await page.locator(':focus').ariaSnapshot()

    // ⑤ Escape でも閉じられること。body 直下へ移った要素で keydown を
    // 拾えているかの確認でもある
    await opener.click()
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()

    saveSnapshot(t.name, 'teleport-dialog', {
      closed,
      opened,
      'opened-app': openedApp,
      'opened-attrs': openedAttrs,
      'focus-opened': focusOpened,
      'focus-trapped': focusTrapped,
      'focus-closed': focusClosed,
    })
  })
}
