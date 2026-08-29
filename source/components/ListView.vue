<script setup lang="ts">
/**
 * :is で差し替えられる側。CardView と対になる。
 *
 * 同じ items を受け取り、こちらは1行1件の一覧として見せる。
 * 2つのビューで役割 (region) と関連付けの張り方を揃えてあるのは、
 * 差し替え後に残るべきものと変わるべきものを分けて観測するため。
 */
import { computed } from 'vue'

const props = defineProps<{
  regionId: string
  items: readonly { id: number; title: string; note: string }[]
}>()

// props からの導出は computed で行う。setup 実行時に一度だけ組み立てると
// regionId が変わっても追随せず、その不追随が「Vapor 起因の差分」に見える。
const headingId = computed(() => `${props.regionId}-heading`)
</script>

<template>
  <div :id="regionId" role="region" :aria-labelledby="headingId">
    <h3 :id="headingId">一覧表示</h3>
    <!-- role="list" を明示するのは、list-style を消した ul を Safari が
         リストとして読まなくなることがあるため -->
    <ul role="list" class="file-list">
      <li v-for="file in items" :key="file.id">
        <span class="file-title">{{ file.title }}</span>
        <span class="file-note">{{ file.note }}</span>
      </li>
    </ul>
  </div>
</template>
