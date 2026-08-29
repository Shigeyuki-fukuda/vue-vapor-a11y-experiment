import { test, expect } from '@playwright/test'
import { saveSnapshot } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

for (const t of targets) {
  test(`live region — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)

    const notify = page.getByRole('button', { name: '通知を表示' })
    // 器 (role=status) は常に DOM にあり、行が出入りする。行を数えれば
    // 「同じ文言が2回積まれた」ことをテキスト比較なしに確認できる
    const toasts = page.getByRole('status').locator('p')

    // ① 初期状態のアクセシビリティツリー
    const before = await page.locator('#app').ariaSnapshot()

    // ② 操作 → 反映待ち
    await notify.click()
    await expect(toasts).toHaveCount(1)
    await expect(toasts.first()).toHaveText('通知が届きました')

    // ③ 操作後のツリー
    const after = await page.locator('#app').ariaSnapshot()

    // ④ もう一度押す。
    //
    // 同じ文字列を代入し直すだけの実装だと DOM が変化せず、live region は
    // 再アナウンスしない。読み上げ検証で確認のため2回押した検証者に
    // 「Vapor では live region が読まれない」と見えてしまうため、
    // 行が増えることを機械側で固定しておく。
    await notify.click()
    await expect(toasts).toHaveCount(2)
    const repeated = await page.locator('#app').ariaSnapshot()

    // ⑤ 自動で消えること。上限は LiveRegionToast の TOAST_DURATION_MS
    // (5000ms) より十分長く取る。短くすると「消えない実装」ではなく
    // 「待ち足りないテスト」で落ちる
    await expect(toasts).toHaveCount(0, { timeout: 15000 })
    const dismissed = await page.locator('#app').ariaSnapshot()

    saveSnapshot(t.name, 'live-region', { before, after, repeated, dismissed })
  })
}
