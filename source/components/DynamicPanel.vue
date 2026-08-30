<script setup lang="ts">
import { computed, ref } from 'vue'
import MonthlyPlan from './MonthlyPlan.vue'
import YearlyPlan from './YearlyPlan.vue'

/**
 * 同じプランを別の支払い間隔で見せる、料金表の「月払い / 年払い」切り替え。
 * 中身は同じで見せ方と一部の情報だけが変わるので、`:is` が実際に使われる
 * 場面として自然で、画面を見ただけで意図が伝わる。
 */
const PLANS = [
  { id: 1, name: 'フリー', monthly: '¥0', yearly: '¥0', saving: '' },
  { id: 2, name: 'スタンダード', monthly: '¥1,200 / 月', yearly: '¥12,000 / 年', saving: '2ヶ月分お得' },
  { id: 3, name: 'ビジネス', monthly: '¥3,800 / 月', yearly: '¥38,000 / 年', saving: '2ヶ月分お得' },
]

const isYearly = ref(false)

// :is へ渡すコンポーネント定義は ref に入れない。ref に入れると定義そのものが
// プロキシ化され、lane ごとに包まれ方が変わりうる。computed で素の定義を選び直す。
const current = computed(() => (isYearly.value ? YearlyPlan : MonthlyPlan))
</script>

<template>
  <section aria-labelledby="dynamic-component-heading">
    <h2 id="dynamic-component-heading">動的コンポーネント: :is による差し替えの検証</h2>
    <button type="button" @click="isYearly = !isYearly">
      {{ isYearly ? '月払いに切り替える' : '年払いに切り替える' }}
    </button>

    <!--
      観測したいのは「差し替え後に role と関連付けが引き継がれるか」。

      両ビューは同じ regionId と同じ plans を受け取り、同じ規則で見出しの id を
      組み立てる。構造が同じで見せ方だけが変わるため、差し替えで関連付けが
      壊れれば「region の名前が前のビューのまま」「describedby が残る」形で出る。

      Vapor は createDynamicComponent という専用の仕組みで差し替えるので、
      classic の VDOM パッチとは別経路になる。
    -->
    <component :is="current" region-id="dynamic-region" :plans="PLANS" />
  </section>
</template>
