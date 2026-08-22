<script setup lang="ts">
import { ref } from 'vue'

const isExpanded = ref(false)

function toggle() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <section aria-labelledby="disclosure-heading">
    <h2 id="disclosure-heading">動的 aria 属性: 開閉パネル</h2>
    <button
      type="button"
      :aria-expanded="isExpanded"
      aria-controls="disclosure-panel"
      @click="toggle"
    >
      コンパイル結果の詳細
    </button>
    <div id="disclosure-panel" v-show="isExpanded">
      <p>Vapor Mode は VDOM を経由せず DOM を直接更新する。</p>
    </div>
  </section>
</template>
