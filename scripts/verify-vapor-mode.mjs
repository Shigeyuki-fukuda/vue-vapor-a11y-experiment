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
  classic: {
    vapor: false,
    strategy: 'vdomProps',
    mountFn: 'createApp',
    ssrMountFn: 'createSSRApp',
  },
  vapor: {
    vapor: true,
    strategy: 'vaporTemplate',
    mountFn: 'createVaporApp',
    ssrMountFn: 'createVaporSSRApp',
  },
}

/**
 * lane ごとに手で書かれているファイル。生成物ではないため sync の同一性検査を
 * 通らず、成果物マーカーはコンパイル戦略しか見ない。つまり
 * **これらは今までどのガードも見ていなかった**。
 *
 * 見逃すと痛いのは index.html / ssr.html で、teleport-dialog のシナリオが
 * body 全体を ariaSnapshot している。片方の body にツリーへ乗る要素を足すと
 * lane 間の恒常的な差分になり、Vapor 起因と誤って帰属される。
 *
 * 要求する同一性は2種類ある。
 *
 * | 種類 | 対象 | 理由 |
 * |---|---|---|
 * | lane 名を伏せれば同一 | index.html / ssr.html / vite.config.mjs | lane 名と title だけが正当な差分 |
 * | バイト単位で同一 | src/entry-server.js | 両 lane で完全に同じであるべき |
 *
 * entry-server.js を正規化側に入れてはいけない。本文が説明のために
 * "vapor" / "Vapor" という語を含むため、自分の lane 名だけを伏せると
 * **バイト同一なのに差分として検出される** (実測で踏んだ)。
 *
 * main.js / main-ssr.js はマウント関数が lane ごとに異なるのが正しいので
 * どちらにも入れない。あちらは verifyEntry が個別に見る。
 */
const LANE_FILES_NORMALIZED = ['index.html', 'ssr.html', 'vite.config.mjs']
const LANE_FILES_IDENTICAL = ['src/entry-server.js']

/**
 * lane 名を伏せ字にして比較可能な形にする。
 *
 * 伏せるのは **その lane 自身の名前だけ**。全 lane 名をまとめて伏せると、
 * classic 側に紛れ込んだ "vapor" の文字列まで一致扱いになってしまう。
 * 自分の名前だけを伏せれば、他 lane の名前の混入は差分として残る。
 */
function normalizeLaneText(text, lane) {
  return text.replaceAll(lane, '{lane}')
}

/**
 * lane ごとの手書きファイルが、意図した範囲でしか違わないことを確認する。
 *
 * README が言う「意図的な差分は3点だけ」を、コンポーネント以外へ広げる層。
 */
function verifyLaneFiles() {
  const [base, ...others] = LANE_NAMES
  const problems = []

  const read = (lane, file) => {
    const path = join('apps', lane, file)
    if (!existsSync(path)) {
      throw new Error(`${path} がありません`)
    }
    return readFileSync(path, 'utf8')
  }

  const compare = (files, transform, requirement) => {
    for (const file of files) {
      const expected = transform(read(base, file), base)
      for (const lane of others) {
        if (transform(read(lane, file), lane) === expected) continue
        problems.push(
          `apps/${base}/${file} と apps/${lane}/${file} が食い違っています。` +
            `この2つは「${requirement}」である必要があります ` +
            `(差分がアクセシビリティツリーに乗ると Vapor 起因と取り違えられます)`
        )
      }
    }
  }

  compare(LANE_FILES_NORMALIZED, normalizeLaneText, 'lane 名を除いてバイト単位で同一')
  compare(LANE_FILES_IDENTICAL, (text) => text, 'バイト単位で同一')

  return problems
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
 * コメントを取り除く。マウント関数の混入判定を本文だけに絞るため。
 *
 * entry のコメントは「classic 側は createSSRApp を使う」のように**相手の
 * lane のマウント関数名を説明として書いている**。素の文字列検索だと、
 * 正しく書かれた entry が「混入」として落ちる (実測で踏んだ)。
 *
 * 対象は import 3行と mount 1行だけの entry なので、正規表現リテラルや
 * "//" を含む文字列は現れない。この単純な除去で足りる。
 */
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

/**
 * entry が lane 相応のマウント関数を使っているかを確認する。
 *
 * Vapor コンポーネントには専用の createVaporApp が必要で、この組み合わせを
 * 間違えても Vite のビルドは成功してしまう。成果物のマーカーはコンパイル
 * 戦略しか見ていないため、entry 側は別に突き合わせる必要がある。
 *
 * entry は2つあり、**どちらも観測点そのもの**なので両方を見る。
 *
 * | entry | 観測しているもの |
 * |---|---|
 * | `main.js` | クライアント描画 (createApp / createVaporApp) |
 * | `main-ssr.js` | hydration (createSSRApp / createVaporSSRApp) |
 *
 * `main-ssr.js` を見落とすと ssr-hydration カテゴリが静かに空振りする。
 * vapor 側を createSSRApp に書き換えても、コンポーネントは vapor として
 * コンパイルされたままなのでマーカー判定は通り、比較対象が
 * 「VDOM hydration 同士」に化けたことに誰も気付けない。
 *
 * @param entryFile entry のファイル名 (apps/{lane}/src からの相対)
 * @param key EXPECTED のどのマウント関数を期待値として使うか
 */
function verifyEntry(name, expected, entryFile, key) {
  const entryPath = join('apps', name, 'src', entryFile)
  if (!existsSync(entryPath)) {
    throw new Error(`${entryPath} がありません`)
  }
  const code = stripComments(readFileSync(entryPath, 'utf8'))
  const problems = []

  if (!new RegExp(`\\b${expected[key]}\\b`).test(code)) {
    problems.push(`${entryPath} が ${expected[key]} を使っていません`)
  }
  for (const other of Object.keys(EXPECTED)) {
    if (other === name) continue
    const otherFn = EXPECTED[other][key]
    // createSSRApp は createVaporSSRApp の部分文字列ではないが、将来
    // 名前が変わっても取りこぼさないよう単語境界で判定する
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
    ...verifyEntry(name, expected, 'main.js', 'mountFn'),
    ...verifyEntry(name, expected, 'main-ssr.js', 'ssrMountFn'),
    ...bundle.problems,
  ]

  return {
    name,
    vapor: expected.vapor,
    mountFn: expected.mountFn,
    ssrMountFn: expected.ssrMountFn,
    files: bundle.files,
    counts: bundle.counts,
    problems,
  }
}

function main() {
  assertExpectationsCoverAllLanes()

  const { files } = assertLaneSourcesIdentical()
  console.log(`✅ 全 lane のソースがバイト単位で同一 (${files.length} files)`)

  const laneFileProblems = verifyLaneFiles()
  if (laneFileProblems.length === 0) {
    const checked = [...LANE_FILES_NORMALIZED, ...LANE_FILES_IDENTICAL].join(', ')
    console.log(`✅ lane ごとの手書きファイルに意図しない差分なし (${checked})`)
  }

  const results = LANE_NAMES.map(verifyLane)

  // マーカーの件数は判定条件ではない (必須 > 0 / 禁止 == 0 だけを見る)。
  // コンポーネントを増やせば動くので、表の数値は参考値として読むこと。
  console.log('')
  console.log(
    '| lane | 期待 vapor | 期待マウント関数 | 期待 SSR マウント関数 | ' +
      'HTML文字列テンプレート | VNode props | 判定 |'
  )
  console.log('|---|---|---|---|---|---|---|')
  for (const r of results) {
    const verdict = r.problems.length === 0 ? '✅ OK' : '❌ NG'
    console.log(
      `| ${r.name} | ${r.vapor} | ${r.mountFn} | ${r.ssrMountFn} | ` +
        `${r.counts.vaporTemplate} | ${r.counts.vdomProps} | ${verdict} |`
    )
  }
  console.log('')

  const failed = results.filter((r) => r.problems.length > 0)
  if (failed.length > 0 || laneFileProblems.length > 0) {
    for (const problem of laneFileProblems) {
      console.error(`❌ ${problem}`)
    }
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
