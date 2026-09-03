import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function saveSnapshot(target, scenario, phases) {
  const dir = join('e2e/snapshots', target)
  mkdirSync(dir, { recursive: true })
  for (const [phase, yaml] of Object.entries(phases)) {
    writeFileSync(join(dir, `${scenario}.${phase}.yaml`), yaml + '\n')
  }
}

/**
 * ariaSnapshot() が出力しない属性を、時点として保存できる形に整える。
 *
 * ariaSnapshot は role / アクセシブルネームと一部の状態 (selected /
 * expanded / checked など) しか出さない。aria-posinset や aria-setsize の
 * ような数値属性は現れないため、リスト再利用の検証では観測対象そのものが
 * スナップショットから抜け落ちる。フォーカス位置を別時点として保存して
 * いるのと同じ理屈で、これも独立した時点として記録する。
 *
 * 出力は要素の出現順どおり。並べ替えでは順序自体が観測対象なのでソートしない。
 *
 * ## 0 件マッチを失敗させる理由
 *
 * locator が何にも当たらないと `evaluateAll` は空配列を返し、**空文字が
 * 時点として保存される**。両 lane で等しく空になるので diff は緑のまま通り、
 * 観測対象がまるごと消えたことに誰も気付けない。
 *
 * これは diff-snapshots の「ベースラインが1件も無いのに緑」と同じ穴の
 * 属性単位版で、ファイル単位より見つけにくい。ファイル自体は存在するので
 * 件数も減らず、中身が空なだけになる。
 *
 * 属性名の打ち間違いは別の壊れ方をする。`getAttribute` が null を返して
 * `(なし)` が両 lane に等しく並ぶため、こちらは保存された yaml を読めば
 * 気付ける (`(なし)` 自体は form-error の recovered など正当な場合もあるので、
 * 機械的には落とさない)。
 */
export async function snapshotAttributes(locator, attributes) {
  const count = await locator.count()
  if (count === 0) {
    throw new Error(
      `snapshotAttributes: locator が 0 件です (${attributes.join(', ')})。` +
        '空の時点を保存すると、観測対象が消えたまま「差分なし」が出ます'
    )
  }

  return locator.evaluateAll(
    (elements, attrs) =>
      elements
        .map((el) => {
          // 行の見出し。input のようにテキストを持たない要素もあるため、
          // テキスト → id → タグ名の順にフォールバックする
          const label =
            (el.textContent ?? '').trim() || el.getAttribute('id') || el.tagName.toLowerCase()
          const pairs = attrs.map((attr) => `${attr}=${el.getAttribute(attr) ?? '(なし)'}`)
          return `- ${label}: ${pairs.join(' ')}`
        })
        .join('\n'),
    attributes
  )
}
