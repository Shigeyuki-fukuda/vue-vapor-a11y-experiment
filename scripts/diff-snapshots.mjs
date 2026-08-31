import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const A = 'e2e/snapshots/classic'
const B = 'e2e/snapshots/vapor'
if (!existsSync(A) || !existsSync(B)) {
  console.error('スナップショットがありません。先に `pnpm run test:e2e` を実行してください')
  process.exit(1)
}

/**
 * 走査するのは両 lane の**和集合**。
 *
 * classic 側だけを列挙すると、vapor 側にしか無いファイルは比較対象にすら
 * 入らず「29件中 差分あり 0件」と報告されて 0 で終わる。lane 同士を
 * 突き合わせているのはこのスクリプトだけなので、片側を基準にすると
 * その片側に無いものは誰も見ないままになる。
 *
 * CI のドリフト検査 (git status) も助けにならない。あれが拾うのは未追跡か
 * 変更済みのファイルなので、孤児が一度コミットされてしまえば以後は無反応になる。
 *
 * .yaml で絞るのは .DS_Store のような非スナップショットを時点として
 * 数えないため。
 */
const isSnapshot = (file) => file.endsWith('.yaml')
const files = [...new Set([...readdirSync(A), ...readdirSync(B)])].filter(isSnapshot).sort()

/**
 * 1件も無ければ失敗させる。
 *
 * 上の existsSync が見ているのはディレクトリの存在だけなので、中身が空でも
 * ここまで到達する。その場合 rows は空、differing も 0 になり
 * 「0件中 差分あり 0件」と表示して **exit 0 で通ってしまう**。
 * 比較対象が1件も無い状態は、差分が無いことの証明ではない。
 */
if (files.length === 0) {
  console.error(`❌ ${A} と ${B} にスナップショットが1件もありません。`)
  console.error('   比較対象が無いだけで、差分が無いことの確認にはなっていません。')
  console.error('   先に `pnpm run test:e2e` を実行してください')
  process.exit(1)
}

/**
 * spec の無いスナップショット (孤児) を失敗させる。
 *
 * 和集合走査が捕まえるのは「片 lane にしか無いファイル」で、**両 lane に
 * 揃って残った古い yaml** は捕まえられない。シナリオをリネーム・削除すると
 * 旧 yaml が stale 同士で一致し続け、件数を水増ししたまま緑になる。
 * CI のドリフト検査 (git status) も、孤児が一度コミットされれば以後は無反応。
 *
 * スナップショット名は `<シナリオ>.<時点>.yaml` なので、先頭要素を
 * e2e/scenarios/<シナリオ>.spec.mjs の集合と突き合わせれば対応が取れる。
 */
const SCENARIO_DIR = 'e2e/scenarios'
const scenarios = new Set(
  readdirSync(SCENARIO_DIR)
    .filter((file) => file.endsWith('.spec.mjs'))
    .map((file) => file.replace(/\.spec\.mjs$/, ''))
)
const orphans = files.filter((file) => !scenarios.has(file.split('.')[0]))
if (orphans.length > 0) {
  console.error(`❌ 対応する spec の無いスナップショットが ${orphans.length}件あります。`)
  console.error(`   ${orphans.join(', ')}`)
  console.error(`   ${SCENARIO_DIR}/ に該当シナリオが無いため、これらは古い記録同士を`)
  console.error('   比較し続けて件数を水増しします。削除するか spec を復活させてください')
  process.exit(1)
}

const read = (dir, file) => {
  const path = join(dir, file)
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

const rows = []
for (const file of files) {
  const a = read(A, file)
  const b = read(B, file)
  rows.push({ file, same: a !== null && b !== null && a === b, a, b })
}

let md = '# ariaSnapshot 差分レポート (classic vs vapor)\n\n'
md += `検証日: ${new Date().toISOString().slice(0, 10)}\n\n`
md += '| シナリオ.時点 | 差分 |\n|---|---|\n'
for (const r of rows) md += `| ${r.file.replace('.yaml','')} | ${r.same ? '✅ なし' : '⚠️ あり'} |\n`
md += '\n'
const differing = rows.filter(r => !r.same)
for (const r of differing) {
  md += `## ⚠️ ${r.file}\n\n### classic\n\n\`\`\`yaml\n${r.a ?? '(取得なし)'}\`\`\`\n\n### vapor\n\n\`\`\`yaml\n${r.b ?? '(取得なし)'}\`\`\`\n\n`
}
writeFileSync('results/diff-report.md', md)
console.log(`results/diff-report.md を出力 (${rows.length}件中 差分あり ${differing.length}件)`)

/**
 * 差分があれば異常終了する。
 *
 * lane 同士を突き合わせているのはこのスクリプトだけで、各 spec は自分の lane の
 * スナップショットを書き出すに留まる。**差分を見つけても 0 を返す作りにすると**、
 * 「Vapor でアクセシビリティツリーが変わった」という、この検証が唯一検出したい
 * 事象が起きたときにこそ `pnpm run check` が緑になってしまう。
 */
if (differing.length > 0) {
  console.error(`❌ classic と vapor に ${differing.length}件の差分。内訳は results/diff-report.md`)
  process.exit(1)
}
