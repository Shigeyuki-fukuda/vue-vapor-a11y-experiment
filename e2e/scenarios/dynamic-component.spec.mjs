import { test, expect } from '@playwright/test'
import { saveSnapshot, snapshotAttributes } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

/**
 * 差し替えで前のパネルの関連付けが残らないかを見る。
 *
 * aria-describedby は内訳パネルだけが持つ。概要へ戻したときに残っていれば、
 * 「差し替えたのに古い関連付けが取り残された」ことになる。
 * この属性は ariaSnapshot の出力に現れないため、別時点として保存する。
 */
const REGION_ATTRIBUTES = ['id', 'aria-labelledby', 'aria-describedby']

for (const t of targets) {
  test(`dynamic component — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)
    const toggle = page.getByRole('button', { name: /(内訳|概要)へ切り替える/ })
    const region = page.locator('#dynamic-region')

    // ① 概要パネル — region の名前は「概要」
    await expect(region).toHaveAttribute('role', 'region')
    await expect(page.getByRole('region', { name: '概要' })).toHaveCount(1)
    const summary = await page.locator('#app').ariaSnapshot()
    const summaryAttrs = await snapshotAttributes(region, REGION_ATTRIBUTES)

    // ② 内訳パネルへ差し替え — role は同じで名前と describedby が変わる
    await toggle.click()
    await expect(page.getByRole('region', { name: '内訳' })).toHaveCount(1)
    const detail = await page.locator('#app').ariaSnapshot()
    const detailAttrs = await snapshotAttributes(region, REGION_ATTRIBUTES)

    // ③ 概要へ戻す — 内訳だけが持っていた describedby が消えていること。
    //    残っていればここで属性の時点が食い違う
    await toggle.click()
    await expect(page.getByRole('region', { name: '概要' })).toHaveCount(1)
    const back = await page.locator('#app').ariaSnapshot()
    const backAttrs = await snapshotAttributes(region, REGION_ATTRIBUTES)

    saveSnapshot(t.name, 'dynamic-component', {
      summary,
      'summary-attrs': summaryAttrs,
      detail,
      'detail-attrs': detailAttrs,
      back,
      'back-attrs': backAttrs,
    })
  })
}
