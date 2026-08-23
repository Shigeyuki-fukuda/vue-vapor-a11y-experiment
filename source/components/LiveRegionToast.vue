<script setup lang="ts">
import { ref } from 'vue'
const message = ref('')
function save() {
  message.value = '保存しました (CI ゲート検証用)'
}
</script>

<template>
  <section aria-labelledby="toast-heading">
    <h2 id="toast-heading">Live Region: トースト通知</h2>
    <button type="button" @click="save">保存</button>
    <p role="status">{{ message }}</p>
  </section>
</template>
