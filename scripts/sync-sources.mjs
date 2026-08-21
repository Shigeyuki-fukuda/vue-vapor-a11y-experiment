import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { LANE_NAMES } from './lanes.mjs'
import { SRC_DIR, listSourceFiles, destPath, assertLaneSourcesIdentical } from './sources.mjs'

/**
 * source/components/ を両 lane へ配布する。
 *
 * 以前は vapor 側だけ `<script setup>` を `<script setup vapor>` に
 * 文字列置換していたが、廃止した。置換は完全一致に依存するため、
 * 例えば `lang="ts"` を付けた途端に無言で不一致になり、vapor 側が
 * classic としてビルドされて「差分なし」という偽の成功を出す危険があった。
 *
 * 現在は Vapor モードの指定を Vite 設定側 (features.vapor) に寄せているため、
 * ここは単純なコピーで済み、両 lane のソースは完全に同一になる。
 */
function main() {
  const files = listSourceFiles()

  for (const lane of LANE_NAMES) {
    mkdirSync(join('apps', lane, 'src', 'components'), { recursive: true })
    for (const file of files) {
      writeFileSync(destPath(lane, file), readFileSync(join(SRC_DIR, file)))
    }
    console.log(`synced -> apps/${lane}/src (${files.length} files)`)
  }

  assertLaneSourcesIdentical()
  console.log(`✅ 全 lane のソースがバイト単位で同一 (${files.length} files)`)
}

try {
  main()
} catch (error) {
  console.error(`❌ ${error.message}`)
  process.exit(1)
}
