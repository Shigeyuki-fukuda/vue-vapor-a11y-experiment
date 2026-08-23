<script setup lang="ts">
import { ref } from 'vue'

const isShown = ref(false)

function toggle() {
  isShown.value = !isShown.value
}
</script>

<template>
  <section aria-labelledby="conditional-heading">
    <h2 id="conditional-heading">条件付き描画: v-if と v-show</h2>
    <button type="button" @click="toggle">補足を切り替え</button>
    <!-- v-if は DOM ごと出入りし、v-show は display で切り替わる。
         どちらもアクセシビリティツリーからは消えるが、
         Vapor のコンパイル結果では扱いが異なるため並べて観測する -->
    <p v-if="isShown">v-if で出し入れされる補足</p>
    <p v-show="isShown">v-show で出し入れされる補足</p>
  </section>
</template>
