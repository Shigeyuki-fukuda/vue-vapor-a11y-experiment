import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { LANE_NAMES } from './lanes.mjs'

export const SRC_DIR = 'source/components'

/** 手で編集する唯一のコンポーネント置き場から .vue を列挙する */
export function listSourceFiles() {
  if (!existsSync(SRC_DIR)) {
    throw new Error(`${SRC_DIR} が存在しません`)
  }
  const files = readdirSync(SRC_DIR)
    .filter((f) => f.endsWith('.vue'))
    .sort()
  if (files.length === 0) {
    throw new Error(`${SRC_DIR} に .vue ファイルがありません`)
  }
  return files
}

/**
 * lane 側の配置先。App.vue だけは src 直下、それ以外は components/ 配下。
 * Vite の entry (apps/{lane}/index.html → src/main.js) がこの配置を前提にしている。
 */
export function destPath(lane, file) {
  const base = join('apps', lane, 'src')
  return file === 'App.vue' ? join(base, file) : join(base, 'components', file)
}

/**
 * 全 lane の配布済みソースがバイト単位で同一であることを検証する。
 *
 * この実験の結論は「観測された差分の原因は Vapor Mode 以外にあり得ない」
 * という前提に立っている。その前提を成立させているのが本 assert であり、
 * ここが黙って崩れると classic 同士の比較を Vapor の比較だと誤認しかねない。
 */
export function assertLaneSourcesIdentical() {
  const files = listSourceFiles()
  const [reference, ...others] = LANE_NAMES

  for (const file of files) {
    const refPath = destPath(reference, file)
    if (!existsSync(refPath)) {
      throw new Error(`${refPath} がありません。先に \`pnpm run sync\` を実行してください`)
    }
    const expected = readFileSync(refPath)

    for (const lane of others) {
      const targetPath = destPath(lane, file)
      if (!existsSync(targetPath)) {
        throw new Error(`${targetPath} がありません。先に \`pnpm run sync\` を実行してください`)
      }
      if (!expected.equals(readFileSync(targetPath))) {
        throw new Error(
          `${file}: ${refPath} と ${targetPath} の内容が一致しません。\n` +
            `  2つの lane はソース完全同一であることが前提です。` +
            `apps/*/src は生成物なので直接編集せず、${SRC_DIR} を編集して ` +
            `\`pnpm run sync\` をやり直してください`
        )
      }
    }
  }

  return { files, lanes: LANE_NAMES }
}
