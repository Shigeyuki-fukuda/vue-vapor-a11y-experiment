<script setup lang="ts">
import { nextTick, ref } from 'vue'

const isOpen = ref(false)
// 要素型を明示する。ref(null) のままでは focus() の存在が型検査されず、
// フォーカス管理の実装ミスが「Vapor 起因の差分」に見えてしまう。
const dialogRef = ref<HTMLDivElement | null>(null)
const openerRef = ref<HTMLButtonElement | null>(null)

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
</script>

<template>
  <section aria-labelledby="teleport-heading">
    <h2 id="teleport-heading">Teleport: body 直下へ移すダイアログ</h2>
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
    -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="teleport-dialog-heading"
        tabindex="-1"
      >
        <h3 id="teleport-dialog-heading">通知パネル</h3>
        <button type="button" @click="close">閉じる</button>
      </div>
    </Teleport>
  </section>
</template>
