import { test, expect } from '@playwright/test'
import { saveSnapshot, snapshotAttributes } from '../helpers/snapshot.mjs'
import { TARGETS, openLane } from '../helpers/targets.mjs'

/**
 * ariaSnapshot に現れない関連付け属性。
 *
 * aria-labelledby / aria-describedby はどちらも出力に現れないが、
 * **labelledby が指す先の文字列はアクセシブルネームとして出る**。
 * つまり textbox の名前が「表示名」になっていれば参照は生きている。
 * 属性値そのものも別時点として残し、「名前は出ているが属性は空」
 * のような食い違いを見逃さないようにする。
 */
const FIELD_ATTRIBUTES = ['aria-labelledby', 'aria-describedby']

for (const t of TARGETS) {
  test(`composition — ${t.name}`, async ({ page }) => {
    await openLane(page, t)
    const field = page.getByRole('textbox', { name: '表示名' })

    // props で渡した id が子まで届き、アクセシブルネームが解決していること。
    // ここが切れると name 指定で要素が見つからず、「差分なし」ではなく
    // テスト失敗として露見する
    await expect(field).toHaveCount(1)

    // スロット経由で描画された説明文が、子の指定した位置に入っていること。
    // 親が書いた要素なので、入る場所を間違えるとツリー上の親子関係が変わる
    const description = page.locator('#composed-description')
    await expect(description).toHaveText('0 / 32')

    const composed = await page.locator('#app').ariaSnapshot()
    const attrs = await snapshotAttributes(field, FIELD_ATTRIBUTES)

    // 入力すると、子が持つ値が親へ戻り、親のスロット内容が書き換わる。
    // **参照先の文字列が変わっても関連付けが切れないこと**がここでの観測点。
    // 静的な描画だけでは「最初に繋がったか」しか見られない。
    await field.fill('さくら')
    await expect(description).toHaveText('3 / 32')

    const typed = await page.locator('#app').ariaSnapshot()
    const typedAttrs = await snapshotAttributes(field, FIELD_ATTRIBUTES)

    saveSnapshot(t.name, 'composition', {
      composed,
      'composed-attrs': attrs,
      typed,
      'typed-attrs': typedAttrs,
    })
  })
}
