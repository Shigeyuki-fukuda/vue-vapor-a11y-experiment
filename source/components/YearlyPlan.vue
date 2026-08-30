<script setup lang="ts">
/**
 * :is で差し替えられる側。MonthlyPlan と同じ props を受け取り、
 * 同じ regionId から見出しの id を組み立てる。
 *
 * 構造を揃えたうえで、**こちらだけ aria-describedby を1本足してある。**
 * 差し替えで「前のビューの関連付けが残る」壊れ方をすると、
 * MonthlyPlan へ戻したときに describedby が消えずに残る形で露見する。
 */
import { computed } from 'vue'

const props = defineProps<{
  regionId: string
  plans: readonly { id: number; name: string; monthly: string; yearly: string; saving: string }[]
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
    <h3 :id="headingId">年払い</h3>
    <p :id="noteId" class="view-note">1年分をまとめて支払うと2ヶ月分お得になります。</p>
    <ul role="list" class="plan-cards">
      <li v-for="plan in plans" :key="plan.id">
        <span class="plan-name">{{ plan.name }}</span>
        <span class="plan-price">{{ plan.yearly }}</span>
        <span v-if="plan.saving" class="plan-saving">{{ plan.saving }}</span>
      </li>
    </ul>
  </div>
</template>
