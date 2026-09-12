/**
 * VoiceOver 実測シート (issue #21) の各カテゴリに貼る画面写真を撮る。
 *
 * ariaSnapshot の YAML は「支援技術から何が見えているか」は表すが、
 * **どの UI を触っている話なのか**は表さない。シートを読む人が
 * 「この読み上げはどのボタンを押したときのものか」を追えるように、
 * カテゴリごとに操作の前後 2 枚を撮る。
 *
 * 撮るのは classic だけ。両 lane はソースがバイト単位で同一なので
 * 見た目は一致し、2倍撮っても読み手の情報は増えない
 * (lane 差は読み上げの側に出る。issue #21 の B2 を参照)。
 *
 * 既に立っている preview サーバへ繋ぐ。playwright.config.mjs の webServer は
 * reuseExistingServer: false なので、`playwright test` として書くと
 * VoiceOver 検証中に立てたままのサーバと strictPort で衝突して落ちる。
 *
 *   pnpm run preview:classic   # 別ターミナルで起動しておく
 *   node scripts/capture-screens.mjs
 */
import { mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { LANES } from './lanes.mjs'

const OUT_DIR = fileURLToPath(new URL('../docs/screenshots/', import.meta.url))
const BASE_URL = `http://localhost:${LANES.classic.previewPort}`
/** 実機の見え方に寄せる。狭すぎるとダイアログの版面が実際と変わる */
const VIEWPORT = { width: 1000, height: 900 }
/** Retina 相当。等倍だと文字が潰れて、貼った先で読めない */
const DEVICE_SCALE_FACTOR = 2
/**
 * トーストとエラーバナーは Transition で入場する。待ち時間を入れて撮ると
 * 入場の途中 (半透明) が写り、「何が出ているのか読めない画像」になる。
 * animations: 'disabled' は CSS のアニメーションを終了状態へ送ってから撮る。
 */
const SCREENSHOT_OPTIONS = { animations: 'disabled' }

/**
 * カテゴリごとの「何を撮るか」。
 *
 * region: 切り抜く領域の名前 (アクセシブルネーム)。null なら <main> 全体。
 * before / after: after が無いカテゴリは 1 枚だけ撮る。
 * fullPageAfter: トーストやダイアログは <section> の外へ出るため全画面で撮る。
 */
const SHOTS = [
  {
    id: 'b01-live-region',
    region: 'Live Region: トースト通知の検証',
    fullPageAfter: true,
    after: async (page) => {
      await page.getByRole('button', { name: '通知を表示' }).click()
      await page.getByRole('status').locator('p').first().waitFor()
    },
  },
  {
    id: 'b02-focus-management',
    region: 'フォーカス管理: モーダルダイアログの検証',
    fullPageAfter: true,
    after: async (page) => {
      await page.getByRole('button', { name: '設定を開く' }).click()
      await page.getByRole('dialog').waitFor()
    },
  },
  {
    id: 'b03-dynamic-aria',
    region: '動的 aria 属性: 開閉パネルの検証',
    after: async (page) => {
      await page.getByRole('button', { name: 'Vapor モードとは何ですか？' }).click()
      await page.getByText('仮想 DOM を経由せず').waitFor()
    },
  },
  {
    id: 'b04-form-error',
    region: 'フォームエラー: 入力欄との紐付けの検証',
    after: async (page) => {
      await page.getByRole('textbox', { name: 'メールアドレス' }).fill('not-an-email')
      await page.getByRole('button', { name: '送信' }).click()
      await page.getByRole('alert').waitFor()
    },
  },
  {
    id: 'b05-conditional-render',
    region: '条件付き描画: v-if と v-show の検証',
    after: async (page) => {
      await page.getByRole('checkbox', { name: '入力のヒントを表示する' }).click()
    },
  },
  {
    id: 'b06-list-reorder',
    region: 'リスト描画: キー付き v-for の再利用の検証',
    after: async (page) => {
      await page.getByRole('button', { name: '先頭を末尾へ' }).click()
    },
  },
  {
    id: 'b07-composition',
    region: 'props / slots によるコンポーネント合成の検証',
    after: async (page) => {
      await page.getByRole('textbox', { name: '表示名' }).fill('さくら')
    },
  },
  {
    id: 'b08-teleport-dialog',
    region: 'Teleport: body 直下へ移すダイアログの検証',
    fullPageAfter: true,
    after: async (page) => {
      await page.getByRole('button', { name: '通知パネルを開く' }).click()
      await page.getByRole('dialog', { name: '通知パネル' }).waitFor()
    },
  },
  {
    id: 'b09-transition-alert',
    region: 'Transition: leave 中のアクセシビリティツリーの検証',
    after: async (page) => {
      await page.getByRole('button', { name: '保存する' }).click()
      await page.getByRole('alert').waitFor()
    },
  },
  {
    id: 'b10-dynamic-component',
    region: '動的コンポーネント: :is による差し替えの検証',
    after: async (page) => {
      await page.getByRole('button', { name: '年払いに切り替える' }).click()
      await page.getByRole('region', { name: '年払い' }).waitFor()
    },
  },
  {
    // hydration の前後で見た目は変わらない。撮るのは配信されている SSR ページ
    id: 'b11-ssr-hydration',
    path: '/ssr.html',
    region: null,
  },
]

async function capture(page, shot) {
  const files = []
  await page.goto(new URL(shot.path ?? '/', BASE_URL).href)

  const target = shot.region
    ? page.getByRole('region', { name: shot.region })
    : page.locator('main')

  const before = path.join(OUT_DIR, `${shot.id}-${shot.after ? 'before' : 'full'}.png`)
  await target.screenshot({ path: before, ...SCREENSHOT_OPTIONS })
  files.push(before)

  if (shot.after) {
    await shot.after(page)
    const after = path.join(OUT_DIR, `${shot.id}-after.png`)
    if (shot.fullPageAfter) {
      await page.screenshot({ path: after, ...SCREENSHOT_OPTIONS })
    } else {
      await target.screenshot({ path: after, ...SCREENSHOT_OPTIONS })
    }
    files.push(after)
  }

  return files
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
  })
  const page = await context.newPage()

  try {
    for (const shot of SHOTS) {
      const files = await capture(page, shot)
      for (const f of files) console.log(`撮影 -> docs/screenshots/${path.basename(f)}`)
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(`❌ 撮影に失敗しました: ${error.message}`)
  console.error(`   preview サーバが ${BASE_URL} に立っているか確認してください`)
  process.exitCode = 1
})
