<script setup lang="ts">
import { ref } from 'vue'

const isVisible = ref(false)
</script>

<template>
  <section aria-labelledby="transition-heading">
    <h2 id="transition-heading">Transition: leave 中のツリー</h2>
    <button type="button" @click="isVisible = !isVisible">
      {{ isVisible ? 'エラーを閉じる' : '保存する' }}
    </button>

    <!--
      観測したいのは「v-if が false になった後、要素が DOM から取り除かれる
      までの間、アクセシビリティツリーに残るか」。

      Transition があると要素の除去はアニメーション完了まで遅延する。
      その間 alert が読まれ続ければ、支援技術には「閉じたはずのエラーが
      まだある」と伝わる。Vapor の VaporTransition は別実装なので、
      classic と残留の仕方が食い違う余地がある。
    -->
    <Transition name="alert">
      <div v-if="isVisible" role="alert">保存に失敗しました</div>
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
