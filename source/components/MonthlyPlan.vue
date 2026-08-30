<script setup lang="ts">
/**
 * :is で差し替えられる側。YearlyPlan と対になる。
 *
 * 同じ plans を受け取り、こちらは1行1プランの一覧として見せる。
 * 2つのビューで役割 (region) と関連付けの張り方を揃えてあるのは、
 * 差し替え後に残るべきものと変わるべきものを分けて観測するため。
 */
import { computed } from 'vue'

const props = defineProps<{
  regionId: string
  plans: readonly { id: number; name: string; monthly: string; yearly: string; saving: string }[]
}>()

// props からの導出は computed で行う。setup 実行時に一度だけ組み立てると
// regionId が変わっても追随せず、その不追随が「Vapor 起因の差分」に見える。
const headingId = computed(() => `${props.regionId}-heading`)
</script>

<template>
  <div :id="regionId" role="region" :aria-labelledby="headingId">
    <h3 :id="headingId">月払い</h3>
    <!-- role="list" を明示するのは、list-style を消した ul を Safari が
         リストとして読まなくなることがあるため -->
    <ul role="list" class="plan-list">
      <li v-for="plan in plans" :key="plan.id">
        <span class="plan-name">{{ plan.name }}</span>
        <span class="plan-price">{{ plan.monthly }}</span>
      </li>
    </ul>
  </div>
</template>
