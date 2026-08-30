<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

/**
 * トーストを自動で消すまでの時間。
 *
 * 読み上げ検証では「出た瞬間」を記録したあと、消えるまでの間に
 * キャプションパネルを見る余裕が要る。短すぎると記録が間に合わない。
 */
const TOAST_DURATION_MS = 5000

const TOAST_MESSAGE = '通知が届きました'

interface Toast {
  readonly id: number
  readonly message: string
}

const toasts = ref<readonly Toast[]>([])
const timers = new Set<ReturnType<typeof setTimeout>>()
let nextId = 0

/**
 * 押すたびに新しいトーストを積む。
 *
 * 以前は同じ文字列を代入し直すだけだった。2回目以降は DOM が変化しないため
 * live region が再アナウンスされず、検証者が確認のためもう一度押すと
 * 「Vapor では live region が読まれない」と見えてしまう。
 * **原因は実装であって Vapor ではない。**
 *
 * 同じ文言でも要素そのものが新しく挿入されれば領域内の変更として扱われる。
 * 文字列の差し替えではなく行の追加にしているのはこのため。
 */
function notify() {
  const id = nextId++
  toasts.value = [...toasts.value, { id, message: TOAST_MESSAGE }]

  const timer = setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
    timers.delete(timer)
  }, TOAST_DURATION_MS)
  timers.add(timer)
}

// 破棄時に残ったタイマーを止める。このアプリでは実際には破棄されないが、
// 消し忘れたタイマーが後から toasts を書き換える形の壊れ方は、
// 再現条件が「時間」なので発生しても差分の原因として疑われにくい。
onBeforeUnmount(() => {
  for (const timer of timers) clearTimeout(timer)
  timers.clear()
})
</script>

<template>
  <section aria-labelledby="toast-heading">
    <h2 id="toast-heading">Live Region: トースト通知</h2>
    <button type="button" @click="notify">通知を表示</button>
    <!--
      role=status を持つ器は最初から DOM に置いておく。押した瞬間に器ごと
      挿入すると、支援技術が領域を監視し始める前に中身が入るため読み上げられない。
      中身の出入りだけを v-for に任せる。

      器は CSS で画面上部へ固定している (一般的な通知の出方に合わせるため)。
      **DOM 上の位置はこのセクションの中のままなので ariaSnapshot は動かない。**
      入場のアニメーションは CSS の @keyframes で当てている。<TransitionGroup> を
      使えば leave 側も付けられるが、このシナリオの観測対象でない Vue 機能を
      持ち込むことになるので採らない。
    -->
    <div role="status" class="toast-region">
      <p v-for="toast in toasts" :key="toast.id" class="toast">{{ toast.message }}</p>
    </div>
  </section>
</template>
