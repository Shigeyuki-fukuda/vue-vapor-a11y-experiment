<script setup lang="ts">
/**
 * :is で差し替えられる側。DetailPanel と同じ props を受け取り、
 * 同じ regionId から見出しの id を組み立てる。
 *
 * 2つのパネルで役割 (region) と関連付けの張り方を揃えてあるのは、
 * 差し替え後に残るべきものと変わるべきものを分けて観測するため。
 * role と aria-labelledby の**構造**は同じで、指す先の**中身**だけが変わる。
 */
const props = defineProps<{ regionId: string }>()

const headingId = `${props.regionId}-heading`
</script>

<template>
  <div :id="regionId" role="region" :aria-labelledby="headingId">
    <h3 :id="headingId">概要</h3>
    <p>6カテゴリすべてで ariaSnapshot の差分は 0 件。</p>
  </div>
</template>
