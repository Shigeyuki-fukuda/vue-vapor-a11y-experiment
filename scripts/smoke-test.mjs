import { Window } from 'happy-dom'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * index.html が実際に読み込んでいるエントリを返す。
 *
 * 以前は dist/assets/ を列挙して最初の .js を使っていたが、ページが
 * index.html と ssr.html の2つになった時点で、辞書順で先に来る共有チャンク
 * (App-*.js) を掴むようになった。共有チャンクはマウント処理を含まないため
 * 「保存ボタンが見つかりません」で落ちる。
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
  const saveButton = [...document.querySelectorAll('button')]
    .find(b => b.textContent.trim() === '保存')
  if (!saveButton) throw new Error(`[${name}] 「保存」ボタンが見つかりません`)
  saveButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  await new Promise(r => setTimeout(r, 50))
  const after = document.querySelector('[role=status]')?.textContent ?? '(なし)'
  console.log(`[${name}] click前: "${before.trim()}" → click後: "${after.trim()}"`)
}

await run('classic')
await run('vapor')
