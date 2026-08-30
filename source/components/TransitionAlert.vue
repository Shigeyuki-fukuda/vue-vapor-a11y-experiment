<script setup lang="ts">
import { ref } from 'vue'

const hasError = ref(false)
// 要素型を明示する理由は ValidatedForm と同じ。focus() の存在を型で押さえる
const saveRef = ref<HTMLButtonElement | null>(null)

/**
 * 閉じたあと、フォーカスを「保存する」へ戻す。
 *
 * 「閉じる」はアラートの中にあるので、押した本人が消える。しかも Transition が
 * あるため消えるのは leave の完了後で、それまでフォーカスは残ったままになり、
 * 完了した瞬間に body へ落ちる。キーボードだけで操作している人からは
 * 「何も押していないのに現在位置が消えた」ように見える。
 *
 * 戻り先を「保存する」にしているのは、そこがこのアラートを出した操作だから。
 */
function dismiss() {
  hasError.value = false
  // leave の完了を待たずにここで移す。待つと上記の 400ms がそのまま
  // 「フォーカスが宙に浮く時間」になる
  saveRef.value?.focus()
}
</script>

<template>
  <section aria-labelledby="transition-heading">
    <h2 id="transition-heading">Transition: leave 中のアクセシビリティツリーの検証</h2>
    <button ref="saveRef" type="button" @click="hasError = true">保存する</button>

    <!--
      観測したいのは「v-if が false になった後、要素が DOM から取り除かれる
      までの間、アクセシビリティツリーに残るか」。

      Transition があると要素の除去はアニメーション完了まで遅延する。
      その間 alert が読まれ続ければ、支援技術には「閉じたはずのエラーが
      まだある」と伝わる。Vapor の VaporTransition は別実装なので、
      classic と残留の仕方が食い違う余地がある。

      閉じるボタンをアラートの中に置いているのは、実際のエラーバナーがその形
      だから。同時に、残留するのが読み上げ文だけでなく**操作できるコントロール**
      でもあることが観測できる。leave の最中、押したはずの「閉じる」はまだ
      ツリーにいて Tab で到達できる。
    -->
    <Transition name="alert">
      <div v-if="hasError" class="alert-banner" role="alert">
        <p>保存に失敗しました</p>
        <button type="button" @click="dismiss">閉じる</button>
      </div>
    </Transition>
  </section>
</template>

<!--
  scoped を付けない。scoped にすると全要素へ data-v-* が付与され、
  Vapor と classic でスコープ id の当て方が違えば、それが Transition とは
  無関係な差分として出てしまう。このシナリオで動かす変数は Transition だけに保つ。

  leave に時間をかけるのは観測のため。一瞬で消えると「残留しない」のか
  「観測できていない」のかを区別できない。opacity のみを動かすのは、
  レイアウトを変えずアクセシビリティツリーへ影響を与えないため。

  バナーの見た目 (.alert-banner) は他のコンポーネントと同じく App.vue にある。
  ここに置くのは Transition の定義だけに絞り、シナリオの変数を増やさない。
-->
<style>
.alert-enter-active,
.alert-leave-active {
  transition: opacity 400ms linear;
}

.alert-enter-from,
.alert-leave-to {
  opacity: 0;
}
</style>
