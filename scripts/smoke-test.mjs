import { Window } from 'happy-dom'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * index.html が実際に読み込んでいるエントリを返す。
 *
 * 以前は dist/assets/ を列挙して最初の .js を使っていたが、ページが
 * index.html と ssr.html の2つになった時点で、辞書順で先に来る共有チャンク
 * (App-*.js) を掴むようになった。共有チャンクはマウント処理を含まないため
 * 「通知を表示ボタンが見つかりません」で落ちる。
 *
 * html から辿れば、チャンクの分かれ方が変わっても対象がずれない。
 */
function entryOf(lane) {
  const html = readFileSync(`apps/${lane}/dist/index.html`, 'utf8')
  const match = html.match(/<script[^>]+src="\/([^"]+\.js)"/)
  if (!match) {
    throw new Error(`apps/${lane}/dist/index.html から module script を特定できません`)
  }
  return match[1]
}

async function run(name) {
  const window = new Window({ url: 'http://localhost/' })
  // Vapor は素のDOM APIを直接叩くため、グローバルにDOMを生やす
  for (const k of ['window','document','Element','Node','Text','Comment',
    'DocumentFragment','SVGElement','CustomEvent','Event','MouseEvent',
    'requestAnimationFrame','cancelAnimationFrame','getComputedStyle',
    'customElements','HTMLElement','MutationObserver']) {
    try { globalThis[k] = window[k] ?? globalThis[k] } catch { /* read-only はスキップ */ }
  }
  document.body.innerHTML = '<div id="app"></div>'

  await import(pathToFileURL(`apps/${name}/dist/${entryOf(name)}`).href)

  const before = document.querySelector('[role=status]')?.textContent ?? '(なし)'
  // 検証コンポーネントが増えても対象がずれないよう、ボタンはテキストで特定する
  const notifyButton = [...document.querySelectorAll('button')]
    .find(b => b.textContent.trim() === '通知を表示')
  if (!notifyButton) throw new Error(`[${name}] 「通知を表示」ボタンが見つかりません`)
  notifyButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  await new Promise(r => setTimeout(r, 50))
  const after = document.querySelector('[role=status]')?.textContent ?? '(なし)'
  console.log(`[${name}] click前: "${before.trim()}" → click後: "${after.trim()}"`)

  /**
   * 反映されたことを判定する。
   *
   * ログを出すだけだと、リアクティビティが完全に死んでいても
   * `?? '(なし)'` に落ちて **exit 0 で通ってしまう**。
   * README が「Vapor マーキングが失われていないことを smoke が確認している」
   * と言う以上、mount が throw しなかったことだけでは足りない。
   * vapor コンポーネントが classic として扱われれば、描画も更新も静かに壊れる。
   */
  const EXPECTED_TEXT = '通知が届きました'
  if (before.includes(EXPECTED_TEXT)) {
    throw new Error(
      `[${name}] click 前から「${EXPECTED_TEXT}」が出ています。` +
        `初期状態が壊れているか、判定文言が実装とずれています`
    )
  }
  if (!after.includes(EXPECTED_TEXT)) {
    throw new Error(
      `[${name}] click 後に「${EXPECTED_TEXT}」が role=status に現れません ` +
        `(実際: "${after.trim()}")。描画が更新されていません`
    )
  }
}

await run('classic')
await run('vapor')
