<script setup lang="ts">
import { computed, ref } from 'vue'
import SummaryPanel from './SummaryPanel.vue'
import DetailPanel from './DetailPanel.vue'

const isDetail = ref(false)

// :is へ渡すコンポーネント定義は ref に入れない。ref に入れると定義そのものが
// プロキシ化され、lane ごとに包まれ方が変わりうる。computed で素の定義を選び直す。
const current = computed(() => (isDetail.value ? DetailPanel : SummaryPanel))
</script>

<template>
  <section aria-labelledby="dynamic-component-heading">
    <h2 id="dynamic-component-heading">動的コンポーネント: :is による差し替え</h2>
    <button type="button" @click="isDetail = !isDetail">
      {{ isDetail ? '概要へ切り替える' : '内訳へ切り替える' }}
    </button>

    <!--
      観測したいのは「差し替え後に role と関連付けが引き継がれるか」。

      両パネルは同じ regionId を受け取り、同じ規則で見出しの id を組み立てる。
      構造が同じで中身だけが変わるため、差し替えで関連付けが壊れれば
      「region の名前が前のパネルのまま」「describedby が残る」形で出る。

      Vapor は createDynamicComponent という専用の仕組みで差し替えるので、
      classic の VDOM パッチとは別経路になる。
    -->
    <component :is="current" region-id="dynamic-region" />
  </section>
</template>
