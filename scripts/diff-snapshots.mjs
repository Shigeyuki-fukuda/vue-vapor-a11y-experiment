import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const A = 'e2e/snapshots/classic'
const B = 'e2e/snapshots/vapor'
if (!existsSync(A) || !existsSync(B)) {
  console.error('スナップショットがありません。先に `pnpm run test:e2e` を実行してください')
  process.exit(1)
}

const rows = []
for (const file of readdirSync(A).sort()) {
  const a = readFileSync(join(A, file), 'utf8')
  const bPath = join(B, file)
  const b = existsSync(bPath) ? readFileSync(bPath, 'utf8') : null
  rows.push({ file, same: b !== null && a === b, a, b })
}

let md = '# ariaSnapshot 差分レポート (classic vs vapor)\n\n'
md += `検証日: ${new Date().toISOString().slice(0, 10)}\n\n`
md += '| シナリオ.時点 | 差分 |\n|---|---|\n'
for (const r of rows) md += `| ${r.file.replace('.yaml','')} | ${r.same ? '✅ なし' : '⚠️ あり'} |\n`
md += '\n'
for (const r of rows.filter(r => !r.same)) {
  md += `## ⚠️ ${r.file}\n\n### classic\n\n\`\`\`yaml\n${r.a}\`\`\`\n\n### vapor\n\n\`\`\`yaml\n${r.b ?? '(取得なし)'}\`\`\`\n\n`
}
writeFileSync('results/diff-report.md', md)
console.log(`results/diff-report.md を出力 (${rows.length}件中 差分あり ${rows.filter(r=>!r.same).length}件)`)
