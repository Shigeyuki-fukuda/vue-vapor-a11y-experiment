<script setup lang="ts">
import { nextTick, ref } from 'vue'

const isOpen = ref(false)
// 要素型を明示する。ref(null) のままでは focus() の存在が型検査されず、
// フォーカス管理の実装ミスが「Vapor 起因の差分」に見えてしまう。
const dialogRef = ref<HTMLDivElement | null>(null)
const openerRef = ref<HTMLButtonElement | null>(null)

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
</script>

<template>
  <section aria-labelledby="focus-heading">
    <h2 id="focus-heading">フォーカス管理: モーダルダイアログ</h2>
    <button ref="openerRef" type="button" @click="open">設定を開く</button>
    <div
      v-if="isOpen"
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-dialog-heading"
      tabindex="-1"
    >
      <h3 id="focus-dialog-heading">表示設定</h3>
      <button type="button" @click="close">閉じる</button>
    </div>
  </section>
</template>
