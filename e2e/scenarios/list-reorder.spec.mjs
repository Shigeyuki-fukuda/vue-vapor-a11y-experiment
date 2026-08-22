import { test, expect } from '@playwright/test'
import { saveSnapshot, snapshotAttributes } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

/**
 * ariaSnapshot に現れない属性。並べ替えで古い値が残らないかを見る。
 *
 * data-probe は初期描画直後にテスト側が振る通し番号で、DOM ノードが
 * 並べ替えで再利用されているかを確かめるための印。印が行と一緒に移動して
 * いれば再利用されており、消えていればノードが作り直されている。
 *
 * これを見ているのは、**このシナリオが空振りしていないこと**を確認するため。
 * ノードが毎回作り直される実装なら「行を再利用する際に古い aria 属性が
 * 残る」という失敗モードをそもそも通らず、差分ゼロが自動的に出てしまう。
 *
 * data-* 属性はアクセシビリティツリーに現れないため、ariaSnapshot 側の
 * 出力には影響しない。
 */
const LIST_ATTRIBUTES = ['aria-posinset', 'aria-setsize', 'aria-selected', 'data-probe']

for (const t of targets) {
  test(`list reorder — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)
    const options = page.getByRole('option')
    const rotate = page.getByRole('button', { name: '先頭を末尾へ' })
    const removeFirst = page.getByRole('button', { name: '先頭を削除' })

    // ① 初期状態 — 1件目が選択済み、posinset は 1..3
    await expect(options).toHaveCount(3)
    await expect(options.first()).toHaveAttribute('aria-selected', 'true')
    // DOM ノードに印を振る (再利用の追跡用。理由は LIST_ATTRIBUTES のコメント)
    await options.evaluateAll((els) => {
      els.forEach((el, index) => {
        el.dataset.probe = String(index)
      })
    })
    const initial = await page.locator('#app').ariaSnapshot()
    const initialAttrs = await snapshotAttributes(options, LIST_ATTRIBUTES)

    // ② 3件目を選択 — 選択状態が末尾へ移る
    await options.nth(2).click()
    await expect(options.nth(2)).toHaveAttribute('aria-selected', 'true')
    await expect(options.first()).toHaveAttribute('aria-selected', 'false')
    const selected = await page.locator('#app').ariaSnapshot()
    const selectedAttrs = await snapshotAttributes(options, LIST_ATTRIBUTES)

    // ③ 先頭を末尾へ回す — :key があるので DOM ノードは再利用される。
    //    選択中だった Hydration が 3番目から 2番目へ動くため、
    //    aria-selected が別の行に取り残されていればここで露見する
    await rotate.click()
    await expect(options.first()).toHaveText('Virtual DOM')
    const rotated = await page.locator('#app').ariaSnapshot()
    const rotatedAttrs = await snapshotAttributes(options, LIST_ATTRIBUTES)

    // ④ 先頭を削除 — setsize が 2 に縮み、posinset が振り直される
    await removeFirst.click()
    await expect(options).toHaveCount(2)
    await expect(options.first()).toHaveText('Hydration')
    const removed = await page.locator('#app').ariaSnapshot()
    const removedAttrs = await snapshotAttributes(options, LIST_ATTRIBUTES)

    saveSnapshot(t.name, 'list-reorder', {
      initial,
      'initial-attrs': initialAttrs,
      selected,
      'selected-attrs': selectedAttrs,
      rotated,
      'rotated-attrs': rotatedAttrs,
      removed,
      'removed-attrs': removedAttrs,
    })
  })
}
