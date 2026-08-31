import { test, expect } from '@playwright/test'
import { saveSnapshot, snapshotAttributes } from '../helpers/snapshot.mjs'
import { TARGETS, openLane } from '../helpers/targets.mjs'

/**
 * 差し替えで前のパネルの関連付けが残らないかを見る。
 *
 * aria-describedby は年払いだけが持つ。月払いへ戻したときに残っていれば、
 * 「差し替えたのに古い関連付けが取り残された」ことになる。
 * この属性は ariaSnapshot の出力に現れないため、別時点として保存する。
 */
const REGION_ATTRIBUTES = ['id', 'aria-labelledby', 'aria-describedby']

for (const t of TARGETS) {
  test(`dynamic component — ${t.name}`, async ({ page }) => {
    await openLane(page, t)
    const toggle = page.getByRole('button', { name: /(年払い|月払い)に切り替える/ })
    const region = page.locator('#dynamic-region')

    // ① 月払い — region の名前は「月払い」
    await expect(region).toHaveAttribute('role', 'region')
    await expect(page.getByRole('region', { name: '月払い' })).toHaveCount(1)
    const summary = await page.locator('#app').ariaSnapshot()
    const summaryAttrs = await snapshotAttributes(region, REGION_ATTRIBUTES)

    // ② 年払いへ差し替え — role は同じで名前と describedby が変わる
    await toggle.click()
    await expect(page.getByRole('region', { name: '年払い' })).toHaveCount(1)
    const detail = await page.locator('#app').ariaSnapshot()
    const detailAttrs = await snapshotAttributes(region, REGION_ATTRIBUTES)

    // ③ 月払いへ戻す — 年払いだけが持っていた describedby が消えていること。
    //    残っていればここで属性の時点が食い違う
    await toggle.click()
    await expect(page.getByRole('region', { name: '月払い' })).toHaveCount(1)
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
