import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = 'source/components'
const targets = [
  { app: 'apps/classic/src', vapor: false },
  { app: 'apps/vapor/src',   vapor: true  },
]

for (const t of targets) {
  const compDir = join(t.app, 'components')
  mkdirSync(compDir, { recursive: true })
  for (const file of readdirSync(SRC)) {
    let code = readFileSync(join(SRC, file), 'utf8')
    if (t.vapor) {
      // 差分はこの1行の置換だけ。それ以外のソースは完全に同一
      code = code.replaceAll('<script setup>', '<script setup vapor>')
    }
    const dest = file === 'App.vue' ? join(t.app, 'App.vue') : join(compDir, file)
    writeFileSync(dest, code)
  }
  console.log(`synced -> ${t.app} (vapor: ${t.vapor})`)
}
