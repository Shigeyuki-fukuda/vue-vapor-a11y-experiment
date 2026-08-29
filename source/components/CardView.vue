<script setup lang="ts">
/**
 * :is で差し替えられる側。ListView と同じ props を受け取り、
 * 同じ regionId から見出しの id を組み立てる。
 *
 * 構造を揃えたうえで、**こちらだけ aria-describedby を1本足してある。**
 * 差し替えで「前のビューの関連付けが残る」壊れ方をすると、
 * ListView へ戻したときに describedby が消えずに残る形で露見する。
 */
import { computed } from 'vue'

const props = defineProps<{
  regionId: string
  items: readonly { id: number; title: string; note: string }[]
}>()

// props からの導出は computed で行う。setup 実行時に一度だけ組み立てると
// regionId が変わっても追随せず、その不追随が「Vapor 起因の差分」に見える。
const headingId = computed(() => `${props.regionId}-heading`)
const noteId = computed(() => `${props.regionId}-note`)
</script>

<template>
  <div
    :id="regionId"
    role="region"
    :aria-labelledby="headingId"
    :aria-describedby="noteId"
  >
    <h3 :id="headingId">カード表示</h3>
    <p :id="noteId" class="view-note">サムネイルを大きく見たいときの表示。</p>
    <ul role="list" class="file-cards">
      <li v-for="file in items" :key="file.id">
        <span class="file-title">{{ file.title }}</span>
        <span class="file-note">{{ file.note }}</span>
      </li>
    </ul>
  </div>
</template>
