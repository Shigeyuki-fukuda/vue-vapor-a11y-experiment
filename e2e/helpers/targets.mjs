import { expect } from '@playwright/test'
import { LANES } from '../../scripts/lanes.mjs'

/**
 * 各 spec が回す lane と、その preview サーバの URL。
 *
 * ポート番号を spec 側に書き写さない。README が「ポートは scripts/lanes.mjs の
 * previewPort が単一の情報源」と言っているとおり、対応表は1箇所にだけ置く。
 *
 * 書き写しが危ないのは、間違えても**落ちない**ため。
 * `{ name: 'vapor', url: 'http://localhost:4173' }` と1文字打ち間違えると、
 * classic のサーバから撮ったツリーが vapor のスナップショットとして保存され、
 * classic 同士の比較になって必ず「差分なし」が出る。verify は成果物しか
 * 見ないので通り、diff は実際に一致しているので通り、CI のドリフト検査も
 * (元々両 lane が同一なので) 無反応になる。**検証だけが静かに消える。**
 */
export const TARGETS = Object.entries(LANES).map(([name, { previewPort }]) => ({
  name,
  url: `http://localhost:${previewPort}`,
}))

/**
 * lane のページを開き、**本当にその lane に繋がっているか**を確かめる。
 *
 * URL を一元化しても取り違えは完全には消えない。preview サーバの起動に
 * 失敗して別 lane の残骸が同じポートを掴んでいれば、正しい URL を指していても
 * 相手は別 lane になる。strictPort と reuseExistingServer: false で塞いでいる
 * 経路だが、確認そのものは安いので二重にしておく。
 *
 * 見るのは lane 帯の data-lane。帯は #app の外にあり aria-hidden="true" なので
 * ariaSnapshot には現れず、この検査を足してもスナップショットは変わらない。
 *
 * @param path lane のルートからの相対パス。既定はクライアント描画のトップ
 */
export async function openLane(page, target, path = '/') {
  await page.goto(new URL(path, target.url).href)
  await expect(page.locator('.lane-banner')).toHaveAttribute('data-lane', target.name)
}
