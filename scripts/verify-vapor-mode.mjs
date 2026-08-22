import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { LANES, LANE_NAMES } from './lanes.mjs'
import { assertLaneSourcesIdentical } from './sources.mjs'

/**
 * ビルド成果物と entry が意図したコンパイル戦略になっているかを検証する。
 *
 * 潰したい失敗モードは2つある。
 *
 * 1. 設定が正しくてもプラグインが黙って無視すれば、vapor lane は classic
 *    としてビルドされ、比較が classic 同士になる。それでも E2E は通り
 *    差分 0 件が出るため、成果物そのものを見ないと気付けない。
 * 2. 設定自体を間違えた場合。こちらは期待値の持ち方を誤ると検出できない
 *    (下の EXPECTED のコメントを参照)。
 *
 * 判定は minify 済みの成果物に対して行う。マーカーはいずれも文字列
 * リテラルかオブジェクトキーであり、識別子と違って minify で消えない。
 */
const MARKERS = {
  /**
   * Vapor: `template("<section aria-labelledby=toast-heading>…")` のような
   * HTML 文字列テンプレート。引用符が省かれた属性を伴う開始タグが特徴。
   * タグ名だけを条件にすると Vue ランタイム内の文字列に誤マッチする
   * (実測: 属性まで含めないと classic 側に 2 件の誤検知が出る)。
   */
  vaporTemplate: {
    label: 'HTML 文字列テンプレート (Vapor)',
    pattern: /`<[a-z][a-z0-9]*\s+[a-z-]+=[a-z]/g,
  },
  /**
   * VDOM: createElementBlock に渡す props オブジェクトの aria キー。
   * 例 `{"aria-labelledby":"toast-heading"}`
   */
  vdomProps: {
    label: 'VNode props オブジェクト (VDOM)',
    pattern: /"aria-[a-z-]+":/g,
  },
}

/**
 * 各 lane があるべき姿。scripts/lanes.mjs とは独立に宣言している。
 *
 * lanes.mjs を参照して期待値を組み立てると、lanes.mjs の設定ミスを
 * 「設定どおりだから正しい」と判定してしまう。実際にこの穴を実測で
 * 確認している (features.vapor を false に倒したのに検証が通った)。
 * 検証の期待値は被検証対象から独立していなければならない。
 *
 * lane を追加したらここにも追加する。忘れた場合は
 * assertExpectationsCoverAllLanes が失敗して気付けるようにしている。
 */
const EXPECTED = {
  classic: { vapor: false, strategy: 'vdomProps', mountFn: 'createApp' },
  vapor: { vapor: true, strategy: 'vaporTemplate', mountFn: 'createVaporApp' },
}

/** lane 定義と期待値の集合がずれていないことを確認する */
function assertExpectationsCoverAllLanes() {
  const missing = LANE_NAMES.filter((name) => !EXPECTED[name])
  const extra = Object.keys(EXPECTED).filter((name) => !LANE_NAMES.includes(name))
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(', ')} の期待値が scripts/verify-vapor-mode.mjs の ` +
        `EXPECTED に定義されていません。検証されない lane が存在します`
    )
  }
  if (extra.length > 0) {
    throw new Error(
      `EXPECTED に存在しない lane が定義されています: ${extra.join(', ')}。` +
        `scripts/lanes.mjs と整合させてください`
    )
  }
}

function readBundle(name) {
  const dir = join('apps', name, 'dist', 'assets')
  if (!existsSync(dir)) {
    throw new Error(`${dir} がありません。先に \`pnpm run build:${name}\` を実行してください`)
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.js'))
  if (files.length === 0) {
    throw new Error(`${dir} に .js がありません。ビルドが失敗している可能性があります`)
  }
  const code = files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n')
  return { files, code }
}

function countMarkers(code) {
  return Object.fromEntries(
    Object.entries(MARKERS).map(([key, { pattern }]) => [key, (code.match(pattern) ?? []).length])
  )
}

/** ビルド設定が期待値どおりかを確認する。設定ミスそのものを捕まえる層 */
function verifyConfig(name, expected) {
  const configured = LANES[name]?.vapor
  if (configured === expected.vapor) return []
  return [
    `scripts/lanes.mjs の ${name}.vapor が ${configured} になっていますが、` +
      `${expected.vapor} であるべきです`,
  ]
}

/**
 * entry (main.js) が lane 相応のマウント関数を使っているかを確認する。
 *
 * Vapor コンポーネントには専用の createVaporApp が必要で、この組み合わせを
 * 間違えても Vite のビルドは成功してしまう。成果物のマーカーはコンパイル
 * 戦略しか見ていないため、entry 側は別に突き合わせる必要がある。
 */
function verifyEntry(name, expected) {
  const entryPath = join('apps', name, 'src', 'main.js')
  if (!existsSync(entryPath)) {
    throw new Error(`${entryPath} がありません`)
  }
  const code = readFileSync(entryPath, 'utf8')
  const problems = []

  if (!new RegExp(`\\b${expected.mountFn}\\b`).test(code)) {
    problems.push(`${entryPath} が ${expected.mountFn} を使っていません`)
  }
  for (const other of Object.keys(EXPECTED)) {
    if (other === name) continue
    const otherFn = EXPECTED[other].mountFn
    if (new RegExp(`\\b${otherFn}\\b`).test(code)) {
      problems.push(`${entryPath} に ${other} lane のマウント関数 ${otherFn} が混入しています`)
    }
  }

  return problems
}

/** 成果物のマーカーがコンパイル戦略と一致するかを確認する */
function verifyBundle(name, expected) {
  const { files, code } = readBundle(name)
  const counts = countMarkers(code)
  const required = expected.strategy
  const forbidden = Object.keys(MARKERS).filter((key) => key !== required)
  const problems = []

  // 0 件はコンパイル戦略が違う場合だけでなく、マーカー自体が陳腐化した
  // 場合にも起きる。どちらにせよ検証が成立していないので失敗させる。
  if (counts[required] === 0) {
    problems.push(
      `${MARKERS[required].label} が 0 件。想定したコンパイル戦略でビルドされていない、` +
        `またはマーカーが実装変更で通用しなくなっています`
    )
  }
  for (const key of forbidden) {
    if (counts[key] > 0) {
      problems.push(
        `${MARKERS[key].label} が ${counts[key]} 件検出されました。` +
          `想定と逆のコンパイル戦略が混入しています`
      )
    }
  }

  return { files, counts, problems }
}

function verifyLane(name) {
  const expected = EXPECTED[name]
  const bundle = verifyBundle(name, expected)
  const problems = [
    ...verifyConfig(name, expected),
    ...verifyEntry(name, expected),
    ...bundle.problems,
  ]

  return {
    name,
    vapor: expected.vapor,
    mountFn: expected.mountFn,
    files: bundle.files,
    counts: bundle.counts,
    problems,
  }
}

function main() {
  assertExpectationsCoverAllLanes()

  const { files } = assertLaneSourcesIdentical()
  console.log(`✅ 全 lane のソースがバイト単位で同一 (${files.length} files)`)

  const results = LANE_NAMES.map(verifyLane)

  console.log('')
  console.log('| lane | 期待 vapor | 期待マウント関数 | HTML文字列テンプレート | VNode props | 判定 |')
  console.log('|---|---|---|---|---|---|')
  for (const r of results) {
    const verdict = r.problems.length === 0 ? '✅ OK' : '❌ NG'
    console.log(
      `| ${r.name} | ${r.vapor} | ${r.mountFn} | ` +
        `${r.counts.vaporTemplate} | ${r.counts.vdomProps} | ${verdict} |`
    )
  }
  console.log('')

  const failed = results.filter((r) => r.problems.length > 0)
  if (failed.length > 0) {
    for (const r of failed) {
      for (const problem of r.problems) {
        console.error(`❌ [${r.name}] ${problem}`)
      }
      console.error(`   対象: ${r.files.map((f) => `apps/${r.name}/dist/assets/${f}`).join(', ')}`)
    }
    process.exit(1)
  }

  console.log('✅ 両 lane が意図どおり別のコンパイル戦略でビルドされています')
}

try {
  main()
} catch (error) {
  console.error(`❌ ${error.message}`)
  process.exit(1)
}
