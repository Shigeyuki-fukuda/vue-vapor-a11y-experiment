<script setup lang="ts">
import { computed, ref } from 'vue'
import LabelledField from './LabelledField.vue'

/** 表示名の上限。入力欄の maxlength と注記の残り文字数で同じ値を使う */
const MAX_LENGTH = 32

const displayName = ref('')

/**
 * maxlength は UTF-16 のコードユニットで数える。表示側だけ [...str].length
 * (コードポイント) で数えると、絵文字を入れたときに「3 / 32」と出ているのに
 * 入力が止まる。数え方を maxlength に揃えて、カウンタが嘘をつかないようにする。
 */
const used = computed(() => displayName.value.length)
</script>

<template>
  <section aria-labelledby="composed-heading">
    <h2 id="composed-heading">props / slots によるコンポーネント合成の検証</h2>

    <!--
      プロフィール設定の「表示名」欄という体裁にしてある。画面を見た人に
      「何を入力する欄か」が伝わらなければ、デモとしても実装例としても
      成立しないため、ラベル・入力欄・注記が縦に並ぶ一般的な形にした。

      ラベルとカウンタは親が持ち、入力欄は子 (LabelledField) が持つ。両者を結ぶのは
      id 参照だけで、その id は props としてコンポーネント境界を越える。
      ここが切れると入力欄はアクセシブルネームを失い、textbox の名前が空になる。

      カウンタが aria-describedby の参照先。入力のたびに書き換わるので、
      **参照先の文字列が変わっても関連付けが保たれるか**を観測できる。
      静的な注記のままだと「最初の描画で繋がったか」しか見られない。

      aria-live は付けない。読み上げへの割り込みは「Live Region」カテゴリの
      観測対象で、ここで重ねるとどちらを見ているのか分からなくなる。
    -->
    <span id="composed-label" class="field-label">表示名</span>
    <LabelledField
      v-model="displayName"
      label-id="composed-label"
      description-id="composed-description"
      :max-length="MAX_LENGTH"
    >
      <p id="composed-description" class="field-counter">{{ used }} / {{ MAX_LENGTH }}</p>
    </LabelledField>
  </section>
</template>
