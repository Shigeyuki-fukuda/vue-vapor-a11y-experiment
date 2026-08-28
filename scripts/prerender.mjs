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

const sha = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12)

async function renderLane(lane) {
  const bundle = resolve('apps', lane, 'dist-server', 'entry-server.js')
  if (!existsSync(bundle)) {
    throw new Error(`${bundle} がありません。先に \`pnpm run build:ssr\` を実行してください`)
  }
  const { render } = await import(pathToFileURL(bundle).href)
  const html = await render()
  if (!html.trim()) {
    throw new Error(`${lane} の render() が空文字を返しました`)
  }
  return html
}

/** 描画結果を ssr.html へ差し込む。差し込めなければ失敗させる */
function inject(lane, html) {
  const page = join('apps', lane, 'dist', 'ssr.html')
  if (!existsSync(page)) {
    throw new Error(`${page} がありません。先に \`pnpm run build:${lane}\` を実行してください`)
  }
  const template = readFileSync(page, 'utf8')

  // 置換に失敗したまま preview されると #app が空になり、hydration ではなく
  // 通常のクライアント描画になる。それでも E2E は通り差分 0 件が出てしまうため、
  // 「検証したい経路を通っていない」ことをここで止める。
  if (!template.includes(OUTLET)) {
    throw new Error(
      `${page} に ${OUTLET} がありません。既に prerender 済みか、テンプレートが変わっています`
    )
  }

  writeFileSync(page, template.replace(OUTLET, html))
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

  const hashes = targets.map((lane) => [lane, sha(rendered[lane])])
  const unique = new Set(hashes.map(([, hash]) => hash))

  console.log('| lane | HTML の長さ | sha256 (先頭12) |')
  console.log('|---|---|---|')
  for (const [lane, hash] of hashes) {
    console.log(`| ${lane} | ${rendered[lane].length} | ${hash} |`)
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
