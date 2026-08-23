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
 */
export async function snapshotAttributes(locator, attributes) {
  return locator.evaluateAll(
    (elements, attrs) =>
      elements
        .map((el) => {
          const text = (el.textContent ?? '').trim()
          const pairs = attrs.map((attr) => `${attr}=${el.getAttribute(attr) ?? '(なし)'}`)
          return `- ${text}: ${pairs.join(' ')}`
        })
        .join('\n'),
    attributes
  )
}
