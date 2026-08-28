<script setup lang="ts">
/**
 * :is で差し替えられる側。SummaryPanel と対になる。
 *
 * 構造を揃えたうえで、こちらだけ aria-describedby を1本足してある。
 * 差し替えで「前のパネルの関連付けが残る」壊れ方をすると、
 * SummaryPanel へ戻したときに describedby が消えずに残る形で露見する。
 */
import { computed } from 'vue'

const props = defineProps<{ regionId: string }>()

// props からの導出は computed で行う。setup 実行時に一度だけ組み立てると
// regionId が変わっても追随せず、その不追随が「Vapor 起因の差分」に見える。
const headingId = computed(() => `${props.regionId}-heading`)
const noteId = computed(() => `${props.regionId}-note`)
</script>

<template>
  <div :id="regionId" role="region" :aria-labelledby="headingId" :aria-describedby="noteId">
    <h3 :id="headingId">内訳</h3>
    <p :id="noteId">属性の比較は *-attrs 時点として別に保存している。</p>
    <ul>
      <li>live region</li>
      <li>フォーカス管理</li>
    </ul>
  </div>
</template>
