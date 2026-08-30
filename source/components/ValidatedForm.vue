<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

/**
 * 「`@` を含むか」だけの判定では `@` や `a@b` まで通ってしまう。
 * ローカル部・ドメイン・TLD の3つが揃っていることまで見る。
 *
 * 厳密な RFC 準拠は目指さない。ここで欲しいのは「不正な入力で確実に
 * エラー状態へ落ちること」であって、検証器そのものではない。
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const email = ref('')
const hasSubmitted = ref(false)
// 要素型を明示する理由は FocusDialog と同じ。focus() の存在を型で押さえる
const fieldRef = ref<HTMLInputElement | null>(null)

const isInvalid = computed(() => hasSubmitted.value && !EMAIL_PATTERN.test(email.value))

/**
 * 送信に失敗したら不正な入力欄へフォーカスを戻す。
 *
 * `role="alert"` はエラー文をその場で読み上げるが、読み上げが終わっても
 * フォーカスは「送信」ボタンに残ったままになる。キーボードだけで操作して
 * いる人は、どこを直せばよいのか分からないまま置き去りにされる。
 *
 * 移動先を不正な入力欄にしているのは、フォーカスが入った時点でラベルと
 * `aria-describedby` 経由のエラー文がまとめて読まれるため。
 */
async function submit() {
  hasSubmitted.value = true
  // isInvalid の反映と aria-describedby の付与を待ってから移動する。
  // 先に移動すると、読み上げが紐付け前のツリーを掴む余地が残る
  await nextTick()
  if (isInvalid.value) fieldRef.value?.focus()
}
</script>

<template>
  <section aria-labelledby="form-heading">
    <h2 id="form-heading">フォームエラー: 入力欄との紐付けの検証</h2>
    <form novalidate @submit.prevent="submit">
      <label for="email-field">メールアドレス</label>
      <!-- type=email はソフトウェアキーボードの種類とブラウザの補完に効く。
           novalidate を付けているので、判定そのものは EMAIL_PATTERN が行う -->
      <input
        id="email-field"
        ref="fieldRef"
        v-model="email"
        type="email"
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
