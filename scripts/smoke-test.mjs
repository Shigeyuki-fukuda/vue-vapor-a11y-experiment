import { Window } from 'happy-dom'
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

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

  const asset = readdirSync(`apps/${name}/dist/assets`).find(f => f.endsWith('.js'))
  await import(pathToFileURL(`apps/${name}/dist/assets/${asset}`).href)

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
