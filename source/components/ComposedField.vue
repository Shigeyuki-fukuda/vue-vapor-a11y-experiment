<script setup lang="ts">
import LabelledField from './LabelledField.vue'
</script>

<template>
  <section aria-labelledby="composed-heading">
    <h2 id="composed-heading">props / slots によるコンポーネント合成</h2>

    <!--
      ラベルと説明文は親が持ち、入力欄は子が持つ。両者を結ぶのは id 参照だけで、
      その id は props としてコンポーネント境界を越える。
      ここが切れると入力欄はアクセシブルネームを失い、textbox の名前が空になる。
    -->
    <span id="composed-label">表示名</span>
    <LabelledField label-id="composed-label" description-id="composed-description">
      <p id="composed-description">全角32文字まで</p>
    </LabelledField>
  </section>
</template>
