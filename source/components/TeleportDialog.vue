<script setup lang="ts">
import { nextTick, ref } from 'vue'

const isOpen = ref(false)
// 要素型を明示する。ref(null) のままでは focus() の存在が型検査されず、
// フォーカス管理の実装ミスが「Vapor 起因の差分」に見えてしまう。
const dialogRef = ref<HTMLDivElement | null>(null)
const openerRef = ref<HTMLButtonElement | null>(null)

/**
 * FocusDialog と同一。フォーカストラップの実装ごと揃えているのは、
 * このシナリオで動かす変数を **Teleport の有無だけ**に保つため。
 * 共通化して1箇所に寄せると「両者は本当に同じ実装か」を読み手が
 * 確認できなくなるので、既存の open / close と同じ方針で並置する。
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// FocusDialog と同じく nextTick 後に移動する。両者の違いを Teleport の
// 有無だけに保つため、フォーカスの取り回しは意図的に揃えている。
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
 * Escape で閉じ、Tab をダイアログ内で循環させる。FocusDialog と同一実装。
 *
 * ここは Teleport で `body` 直下へ移った要素に対して働く。移動先でも
 * querySelectorAll がダイアログ内の要素を拾えるかどうかは、template ref が
 * 移動後の要素を指しているかに依存する。繋がっていなければトラップは
 * 無言で効かなくなるため、E2E 側で Tab の行き先を assert する。
 */
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
    return
  }
  if (event.key !== 'Tab') return

  const root = dialogRef.value
  if (!root) return

  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
  if (items.length === 0) {
    event.preventDefault()
    root.focus()
    return
  }

  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement

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
  <section aria-labelledby="teleport-heading">
    <h2 id="teleport-heading">Teleport: body 直下へ移すダイアログの検証</h2>
    <!--
      文言に既存ボタンの名前を含めない。Playwright の name 照合は部分一致なので、
      「通知設定を開く」にすると FocusDialog の「設定を開く」を狙った
      getByRole がこちらにも当たり、strict mode violation で落ちる。
    -->
    <button ref="openerRef" type="button" @click="open">通知パネルを開く</button>

    <!--
      FocusDialog との違いは Teleport の有無だけ。
      移動先が body 直下になるため、ダイアログは #app の外へ出る。

      観測したいのは2点。
      1. 移動先でも aria-modal と aria-labelledby の関連付けが保たれるか
      2. template ref (dialogRef) が移動後の要素を指し、フォーカスが入るか

      Vapor の Teleport は VaporTeleport という別実装なので、
      「移動そのものは成功しているのに ref だけ繋がっていない」形の
      壊れ方があり得る。その場合フォーカスが body に残る。

      バックドロップも Teleport の中に入れる。#app 側に残すとダイアログだけが
      body 直下へ移り、重ね順がこのコンポーネントの外の事情 (DOM 上の前後関係)
      で決まってしまう。aria-hidden を付けてあるので body の ariaSnapshot は
      これを含まない。
    -->
    <Teleport to="body">
      <div v-if="isOpen" class="dialog-backdrop" aria-hidden="true" @click="close"></div>
      <div
        v-if="isOpen"
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="teleport-dialog-heading"
        tabindex="-1"
        @keydown="onKeydown"
      >
        <h3 id="teleport-dialog-heading">通知パネル</h3>
        <button type="button" @click="close">閉じる</button>
      </div>
    </Teleport>
  </section>
</template>
