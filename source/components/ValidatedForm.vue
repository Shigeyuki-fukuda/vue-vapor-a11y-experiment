<script setup>
import { computed, ref } from 'vue'

const email = ref('')
const hasSubmitted = ref(false)

const isInvalid = computed(() => hasSubmitted.value && !email.value.includes('@'))

function submit() {
  hasSubmitted.value = true
}
</script>

<template>
  <section aria-labelledby="form-heading">
    <h2 id="form-heading">フォームエラー: 入力検証</h2>
    <form novalidate @submit.prevent="submit">
      <label for="email-field">メールアドレス</label>
      <input
        id="email-field"
        v-model="email"
        type="text"
        :aria-invalid="isInvalid"
        :aria-describedby="isInvalid ? 'email-error' : undefined"
      />
      <p v-if="isInvalid" id="email-error" role="alert">
        メールアドレスの形式が正しくありません
      </p>
      <button type="submit">送信</button>
    </form>
  </section>
</template>
