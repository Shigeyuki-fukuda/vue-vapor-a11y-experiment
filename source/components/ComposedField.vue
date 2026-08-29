<script setup lang="ts">
import LabelledField from './LabelledField.vue'
</script>

<template>
  <section aria-labelledby="composed-heading">
    <h2 id="composed-heading">props / slots によるコンポーネント合成</h2>

    <!--
      プロフィール設定の「表示名」欄という体裁にしてある。画面を見た人に
      「何を入力する欄か」が伝わらなければ、デモとしても実装例としても
      成立しないため、ラベル・入力欄・注記が縦に並ぶ一般的な形にした。

      ラベルと注記は親が持ち、入力欄は子 (LabelledField) が持つ。両者を結ぶのは
      id 参照だけで、その id は props としてコンポーネント境界を越える。
      ここが切れると入力欄はアクセシブルネームを失い、textbox の名前が空になる。
    -->
    <span id="composed-label" class="field-label">表示名</span>
    <LabelledField label-id="composed-label" description-id="composed-description">
      <p id="composed-description" class="field-hint">
        ほかの利用者に公開されます。全角32文字まで。
      </p>
    </LabelledField>
  </section>
</template>
