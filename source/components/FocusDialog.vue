<script setup lang="ts">
import { nextTick, ref } from 'vue'

const isOpen = ref(false)
// 要素型を明示する。ref(null) のままでは focus() の存在が型検査されず、
// フォーカス管理の実装ミスが「Vapor 起因の差分」に見えてしまう。
const dialogRef = ref<HTMLDivElement | null>(null)
const openerRef = ref<HTMLButtonElement | null>(null)

/**
 * ダイアログ内でフォーカスを受け取れる要素の探索条件。
 *
 * 生成される DOM は両 lane で同一なので、ここで拾える要素も同一になる。
 * 差が出るとすれば「template ref がどの要素を指しているか」であり、
 * それは E2E の focus-* 時点として記録される。
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// フォーカス移動は必ず nextTick 後に行う。
// setTimeout などタイミング依存の書き方をすると、観測された差分が
// Vapor 起因か実装起因か切り分けられなくなるため例外を作らない。
async function open() {
  isOpen.value = true
  await nextTick()
  dialogRef.value?.focus()
}

async function close() {
  isOpen.value = false
  await nextTick()
  openerRef.value?.focus()
}

/**
 * Escape で閉じ、Tab をダイアログの内側で循環させる (フォーカストラップ)。
 *
 * `aria-modal="true"` は支援技術のカーソルに対する宣言でしかなく、
 * ブラウザの Tab 順には何の影響も与えない。宣言だけ置いて実装を伴わないと
 * 「モーダルと名乗っているのにキーボードでは背後へ出られる」状態になる。
 *
 * 背景を `inert` にする実装は**採らない**。inert は背後をアクセシビリティ
 * ツリーごと消すため、VoiceOver 手順の項目2 / 項目8 が見ている
 * 「`aria-modal` だけでダイアログの外へ出られなくなるか」を観測できなくなる。
 * ポインタ操作の遮断は aria-hidden なバックドロップが担当する。
 *
 * キー判定に `@keydown.esc` / `@keydown.tab` の修飾子を使わないのは、
 * 修飾子のコンパイル結果が lane ごとに別経路 (withKeys / 直接生成) になり、
 * このシナリオの観測対象でないものを差分の候補に増やしてしまうため。
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    // 既定動作を止めてから閉じる。Escape はブラウザ側で読み込み中断などに
    // 割り当てられているため、閉じる操作と二重に走らせない。
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab') return

  const root = dialogRef.value
  if (!root) return

  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
  if (items.length === 0) {
    // 行き先が無ければダイアログ自身へ戻す。外へ出さないことを優先する
    event.preventDefault()
    root.focus()
    return
  }

  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement

  // 逆順で先頭 (またはダイアログ自身) にいるなら末尾へ、
  // 順方向で末尾にいるなら先頭へ折り返す。
  if (event.shiftKey && (active === first || active === root)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <section aria-labelledby="focus-heading">
    <h2 id="focus-heading">フォーカス管理: モーダルダイアログの検証</h2>
    <button ref="openerRef" type="button" @click="open">設定を開く</button>

    <!--
      背後のクリックを遮る幕。aria-hidden を付けてアクセシビリティツリーから
      外しているので ariaSnapshot には現れず、VoiceOver から見た構造も変わらない。
      「モーダルに見えること」と「背後を押せないこと」だけを担当する。
    -->
    <div v-if="isOpen" class="dialog-backdrop" aria-hidden="true" @click="close"></div>

    <div
      v-if="isOpen"
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-dialog-heading"
      tabindex="-1"
      @keydown="onKeydown"
    >
      <h3 id="focus-dialog-heading">設定</h3>
      <!--
        中身は文言だけにしてある。操作できる要素を足すとフォーカストラップの
        観測対象が変わる。E2E の focus-trapped は「Tab を2回押しても閉じるに
        留まる」ことを見ており、ダイアログ内の到達可能な要素が増えると
        その assert が別の意味になってしまう。
      -->
      <p>アカウントと通知に関する設定をここにまとめます。</p>
      <p>変更は自動的に保存されます。</p>
      <button type="button" @click="close">閉じる</button>
    </div>
  </section>
</template>
