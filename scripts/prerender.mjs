import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { LANE_NAMES } from './lanes.mjs'

/**
 * SSR ビルドの成果物で ssr.html を埋める。
 *
 * この検証で SSR を扱ううえでの前提は「サーバ側は両 lane で同一」。
 * compileTemplate は ssr:true のとき vapor フラグを無視するため、
 * 両 lane から同じ ssrRender が出る (README「SSR / hydration」)。
 *
 * ただしそれを前提として書き込むのではなく、**毎回両方を描画して
 * 突き合わせる**。将来の Vue でここが変われば、その瞬間に気付ける。
 * 一致していれば、hydration 後に出たツリーの差は入力 HTML ではなく
 * hydration 実装の違いに帰せられる。
 */
const OUTLET = '<!--ssr-outlet-->'

/**
 * `<Teleport to="body">` の中身を差し込む位置。
 *
 * Teleport の描画結果は本体の HTML に含まれず `context.teleports.body` に
 * 溜まる。ここを埋め忘れると、移動先 (body) にマーカーが無いまま hydration が
 * 始まり、クライアントは body の先頭から順にノードを Teleport の中身として
 * 取り込む。**実測では `#app` と `<script>` が丸ごと消えてページが白紙になり、
 * それでも例外は出ず「Hydration completed but contains mismatches」しか
 * 残らなかった。** 静かに壊れる経路なので、下で存在と非空を検査している。
 */
const TELEPORT_OUTLET = '<!--ssr-teleports-->'

const sha = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12)

async function renderLane(lane) {
  const bundle = resolve('apps', lane, 'dist-server', 'entry-server.js')
  if (!existsSync(bundle)) {
    throw new Error(`${bundle} がありません。先に \`pnpm run build:ssr\` を実行してください`)
  }
  const { render } = await import(pathToFileURL(bundle).href)
  const result = await render()

  if (!result?.html?.trim()) {
    throw new Error(`${lane} の render() が空の HTML を返しました`)
  }

  const teleports = result.teleports?.body ?? ''
  // アプリには Teleport が1つあるので、空になるのは entry-server が context を
  // 渡し忘れたか、Teleport 自体が消えたときだけ。どちらも黙って通すと
  // 上のコメントに書いた壊れ方に直行する。
  if (!teleports.trim()) {
    throw new Error(
      `${lane} の render() が body 向けの teleports を返しませんでした。` +
        `apps/${lane}/src/entry-server.js が renderToString に context を渡しているか、` +
        `アプリから Teleport が消えていないかを確認してください`
    )
  }

  return { html: result.html, teleports }
}

/** 描画結果を ssr.html へ差し込む。差し込めなければ失敗させる */
function inject(lane, rendered) {
  const page = join('apps', lane, 'dist', 'ssr.html')
  if (!existsSync(page)) {
    throw new Error(`${page} がありません。先に \`pnpm run build:${lane}\` を実行してください`)
  }

  let template = readFileSync(page, 'utf8')

  // 置換に失敗したまま preview されると #app が空になり、hydration ではなく
  // 通常のクライアント描画になる。それでも E2E は通り差分 0 件が出てしまうため、
  // 「検証したい経路を通っていない」ことをここで止める。
  const replacements = [
    [OUTLET, rendered.html],
    [TELEPORT_OUTLET, rendered.teleports],
  ]
  for (const [placeholder, value] of replacements) {
    if (!template.includes(placeholder)) {
      throw new Error(
        `${page} に ${placeholder} がありません。既に prerender 済みか、テンプレートが変わっています`
      )
    }
    // 置換文字列は関数で渡す。描画結果に `$&` などが含まれると、
    // 文字列指定では置換パターンとして解釈されてしまう
    template = template.replace(placeholder, () => value)
  }

  writeFileSync(page, template)
  return page
}

/**
 * 対象 lane を決める。引数なしなら全 lane。
 *
 * 1 lane だけ指定できるようにしてあるのは Playwright の webServer のため。
 * 各 lane が独立に「ビルド → prerender → preview」を走らせるので、
 * そこで全 lane を対象にすると、まだビルドされていない相手の
 * dist-server を読みにいって競合する。
 */
function resolveTargets() {
  const [requested] = process.argv.slice(2)
  if (!requested) return LANE_NAMES
  if (!LANE_NAMES.includes(requested)) {
    throw new Error(`未知の lane: ${requested} (有効な値: ${LANE_NAMES.join(', ')})`)
  }
  return [requested]
}

async function main() {
  const targets = resolveTargets()
  const rendered = {}
  for (const lane of targets) {
    rendered[lane] = await renderLane(lane)
  }

  // 本体と teleports の両方を一致の対象にする。片方だけ見ていると、
  // 差し込み先が2箇所あることを忘れた変更が無検査で通る
  const digest = (r) => sha(`${r.html} ${r.teleports}`)
  const rows = targets.map((lane) => [lane, rendered[lane], digest(rendered[lane])])

  console.log('| lane | HTML の長さ | teleports の長さ | sha256 (先頭12) |')
  console.log('|---|---|---|---|')
  for (const [lane, r, hash] of rows) {
    console.log(`| ${lane} | ${r.html.length} | ${r.teleports.length} | ${hash} |`)
  }
  console.log('')

  // lane 間の一致は複数 lane を見ているときにしか判定できない。
  // 黙って飛ばすと「確認したつもり」になるので、飛ばしたことを明示する。
  // 全 lane での確認は pnpm run build (= 引数なし) が毎回行う。
  if (targets.length < LANE_NAMES.length) {
    console.log(`ℹ️ ${targets.join(', ')} のみ対象。lane 間の一致確認は引数なし実行で行う`)
    for (const lane of targets) {
      console.log(`prerendered -> ${inject(lane, rendered[lane])}`)
    }
    return
  }

  const unique = new Set(rows.map(([, , hash]) => hash))
  if (unique.size !== 1) {
    console.error(
      '❌ lane ごとにサーバ描画の HTML が違います。' +
        'この検証は「サーバ側は共通、差が出るなら hydration」という前提に' +
        '立っているため、前提そのものが崩れています。' +
        'README「SSR / hydration」を更新してください'
    )
    process.exit(1)
  }
  console.log('✅ サーバ描画の HTML は全 lane で同一 (hydration 前の入力が揃っている)')

  for (const lane of targets) {
    console.log(`prerendered -> ${inject(lane, rendered[lane])}`)
  }
}

try {
  await main()
} catch (error) {
  console.error(`❌ ${error.message}`)
  process.exit(1)
}
