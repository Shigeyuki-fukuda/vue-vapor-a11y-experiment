import { test, expect } from '@playwright/test'
import { saveSnapshot, snapshotAttributes } from '../helpers/snapshot.mjs'
import { TARGETS, openLane } from '../helpers/targets.mjs'

/**
 * aria-invalid は ariaSnapshot に `[invalid]` として出るが、
 * **aria-describedby の紐付けは出力に現れない**。エラー文の要素自体は
 * `alert:` として出るので「エラーが表示された」ことは分かるが、
 * それが入力欄に結び付いているかは分からない。
 *
 * 下の assert でも紐付けを確認している。あちらは期待値を固定する検証で、
 * 時点として保存するのは2系統の突き合わせに載せるため。
 */
const FIELD_ATTRIBUTES = ['aria-invalid', 'aria-describedby']

for (const t of TARGETS) {
  test(`form error — ${t.name}`, async ({ page }) => {
    await openLane(page, t)
    const field = page.getByLabel('メールアドレス')
    const submit = page.getByRole('button', { name: '送信' })
    const alert = page.getByRole('alert')

    // ① 未送信の状態
    const pristine = await page.locator('#app').ariaSnapshot()
    const pristineAttrs = await snapshotAttributes(field, FIELD_ATTRIBUTES)

    // ② 不正な値で送信 → エラー表示の確定を待ってから取得
    await field.fill('not-an-email')
    await submit.click()
    await expect(alert).toBeVisible()
    await expect(field).toHaveAttribute('aria-describedby', 'email-error')
    // 送信失敗時にフォーカスが不正な入力欄へ移ること。
    // role=alert はエラー文をその場で読むだけで、フォーカスは「送信」に
    // 残る。移していないとキーボード利用者はどこを直すか分からない
    await expect(field).toBeFocused()
    const invalid = await page.locator('#app').ariaSnapshot()
    const invalidAttrs = await snapshotAttributes(field, FIELD_ATTRIBUTES)
    // フォーカス位置は ariaSnapshot に出ないため別時点として保存する。
    // 入力欄が「エラーと紐付いた状態」でフォーカスされていることを記録する
    const focusInvalid = await page.locator(':focus').ariaSnapshot()

    // ③ 正しい値に直す → エラー解除の確定を待ってから取得
    await field.fill('user@example.com')
    await expect(alert).toBeHidden()
    await expect(field).not.toHaveAttribute('aria-describedby', 'email-error')
    const recovered = await page.locator('#app').ariaSnapshot()
    const recoveredAttrs = await snapshotAttributes(field, FIELD_ATTRIBUTES)

    saveSnapshot(t.name, 'form-error', {
      pristine,
      invalid,
      recovered,
      'focus-invalid': focusInvalid,
      'pristine-attrs': pristineAttrs,
      'invalid-attrs': invalidAttrs,
      'recovered-attrs': recoveredAttrs,
    })
  })
}
