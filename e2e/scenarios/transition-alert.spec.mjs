import { test, expect } from '@playwright/test'
import { saveSnapshot } from '../helpers/snapshot.mjs'

const targets = [
  { name: 'classic', url: 'http://localhost:4173' },
  { name: 'vapor',   url: 'http://localhost:4174' },
]

for (const t of targets) {
  test(`transition alert — ${t.name}`, async ({ page }) => {
    await page.goto(t.url)
    // 「閉じる」はダイアログ2種にも同名のボタンがある。どちらも既定では
    // 閉じているので現状は一意に決まるが、シナリオが増えたときに
    // 静かに別の要素を掴まないよう、セクションの中に閉じ込めておく
    const section = page.getByRole('region', { name: 'Transition: leave 中のアクセシビリティツリーの検証' })
    const save = section.getByRole('button', { name: '保存する' })
    const dismiss = section.getByRole('button', { name: '閉じる' })
    const alert = page.getByRole('alert')

    // ① 初期状態 — alert なし
    await expect(alert).toHaveCount(0)
    const initial = await page.locator('#app').ariaSnapshot()

    // ② 表示 — 入場アニメーションの完了まで待つ。
    //    待たずに取ると「取得タイミング由来」の差分がノイズとして出る。
    //    完了の判定にクラスを使うのは、待ち時間を実装依存にしないため
    await save.click()
    await expect(alert).toBeVisible()
    await expect(alert).not.toHaveClass(/alert-enter-active/)
    const shown = await page.locator('#app').ariaSnapshot()

    // ③ leave の最中 — このシナリオの本題。
    //    v-if は false になっているが要素はまだ DOM にいる。
    //    この間 alert がツリーに残るかどうかが観測対象で、
    //    残れば支援技術には「閉じたはずのエラーがまだある」と伝わる。
    //    残るのは読み上げ文だけではない。押したはずの「閉じる」も
    //    同じツリーに居続け、Tab で到達できる
    await dismiss.click()
    await expect(alert).toHaveClass(/alert-leave-active/)
    const leaving = await page.locator('#app').ariaSnapshot()

    // 消えていく要素の上にフォーカスを置き去りにしていないこと。
    // dismiss() が「保存する」へ戻しているので、leave の最中も完了後も
    // フォーカスは同じ場所にある。戻していなければ leave の完了と同時に
    // body へ落ち、キーボード操作の現在位置が黙って失われる
    await expect(save).toBeFocused()

    // 撮影後にもう一度確かめる。撮っている間に leave が完了していたら
    // leaving は「消えた後」の姿になり、記録として誤りになる。
    // 黙って間違ったスナップショットを残すより、ここで落ちたほうがよい
    // (落ちた場合は style の transition 時間を延ばす)
    await expect(alert).toHaveClass(/alert-leave-active/)

    // ④ leave 完了 — 要素が DOM から消える
    await expect(alert).toHaveCount(0)
    const gone = await page.locator('#app').ariaSnapshot()

    saveSnapshot(t.name, 'transition-alert', {
      initial,
      shown,
      leaving,
      gone,
    })
  })
}
