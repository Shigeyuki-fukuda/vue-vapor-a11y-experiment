<script setup lang="ts">
/**
 * :is で差し替えられる側。DetailPanel と同じ props を受け取り、
 * 同じ regionId から見出しの id を組み立てる。
 *
 * 2つのパネルで役割 (region) と関連付けの張り方を揃えてあるのは、
 * 差し替え後に残るべきものと変わるべきものを分けて観測するため。
 * role と aria-labelledby の**構造**は同じで、指す先の**中身**だけが変わる。
 */
import { computed } from 'vue'

const props = defineProps<{ regionId: string }>()

// props からの導出は computed で行う。setup 実行時に一度だけ組み立てると
// regionId が変わっても追随せず、その不追随が「Vapor 起因の差分」に見える。
const headingId = computed(() => `${props.regionId}-heading`)
</script>

<template>
  <div :id="regionId" role="region" :aria-labelledby="headingId">
    <h3 :id="headingId">概要</h3>
    <!-- 件数は書かない。カテゴリを増やすたびに古くなるうえ、
         この文字列はスナップショットに記録されて残るため -->
    <p>アクセシビリティツリーは全カテゴリで一致している。</p>
  </div>
</template>
