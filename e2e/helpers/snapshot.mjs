import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export function saveSnapshot(target, scenario, phases) {
  const dir = join('e2e/snapshots', target)
  mkdirSync(dir, { recursive: true })
  for (const [phase, yaml] of Object.entries(phases)) {
    writeFileSync(join(dir, `${scenario}.${phase}.yaml`), yaml + '\n')
  }
}
