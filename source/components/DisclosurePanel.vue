<script setup lang="ts">
import { ref } from 'vue'

const isExpanded = ref(false)

function toggle() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <section aria-labelledby="disclosure-heading">
    <h2 id="disclosure-heading">動的 aria 属性: 開閉パネルの検証</h2>
    <!--
      よくある質問の1項目という体裁にしてある。disclosure が実際に使われる形へ
      寄せておかないと、読み上げを聞いたときに「この UI なら本来どう読まれるべきか」
      という基準が持てず、lane 間の差だけを見て良し悪しを決めることになる。

      三角の印は中身の無い span へ CSS で描いている。::before の content で文字を
      出すとアクセシブルネームに混ざるため使わない (App.vue の <style> のコメント参照)。
    -->
    <button
      type="button"
      class="disclosure-toggle"
      :aria-expanded="isExpanded"
      aria-controls="disclosure-panel"
      @click="toggle"
    >
      Vapor モードとは何ですか？
      <span class="disclosure-marker" aria-hidden="true"></span>
    </button>
    <div id="disclosure-panel" class="disclosure-panel" v-show="isExpanded">
      <p>
        仮想 DOM を経由せず DOM を直接更新する描画方式です。差分計算が無いぶん、画面の更新が速くなります。
      </p>
    </div>
  </section>
</template>
