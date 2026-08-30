<script setup lang="ts">
import { ref } from 'vue'

const isShown = ref(false)
</script>

<template>
  <section aria-labelledby="conditional-heading">
    <h2 id="conditional-heading">条件付き描画: v-if と v-show の検証</h2>
    <!--
      設定画面の「説明を表示する」と同じ形にしてある。

      チェックボックスにしたのは、開閉の状態を自分で名乗れるため。
      ボタンで文章を出し入れする形にすると aria-expanded を付けるのが筋になるが、
      それは「動的 aria 属性」カテゴリの観測対象で、ここで重ねると
      どちらのカテゴリを見ているのか分からなくなる。
      チェックボックスなら checked がそのまま読み上げられるので、
      余分な aria 属性を持ち込まずに UI として成立する。
    -->
    <div class="checkbox-field">
      <input id="hint-toggle" v-model="isShown" type="checkbox" />
      <label for="hint-toggle">入力のヒントを表示する</label>
    </div>
    <!-- v-if は DOM ごと出入りし、v-show は display で切り替わる。
         どちらもアクセシビリティツリーからは消えるが、
         Vapor のコンパイル結果では扱いが異なるため並べて観測する -->
    <p v-if="isShown" class="field-hint">ユーザー ID は半角英数字で入力してください。</p>
    <p v-show="isShown" class="field-hint">記号は - と _ だけ使えます。</p>
  </section>
</template>
