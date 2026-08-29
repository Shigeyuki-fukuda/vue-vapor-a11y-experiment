<script setup lang="ts">
import { computed, ref } from 'vue'
import ListView from './ListView.vue'
import CardView from './CardView.vue'

/**
 * 表示形式を切り替えても中身は同じで、変わるのは見せ方だけ、という
 * ファイル一覧の「一覧 / カード」切り替えにしてある。`:is` が実際に
 * 使われる場面として最も一般的で、画面を見ただけで意図が伝わる。
 */
const FILES = [
  { id: 1, title: '2026年7月 請求書.pdf', note: '7月2日 更新 · 220 KB' },
  { id: 2, title: '登壇資料 v3.key', note: '7月18日 更新 · 12.4 MB' },
  { id: 3, title: '検証ログ.csv', note: '7月26日 更新 · 48 KB' },
]

const isCard = ref(false)

// :is へ渡すコンポーネント定義は ref に入れない。ref に入れると定義そのものが
// プロキシ化され、lane ごとに包まれ方が変わりうる。computed で素の定義を選び直す。
const current = computed(() => (isCard.value ? CardView : ListView))
</script>

<template>
  <section aria-labelledby="dynamic-component-heading">
    <h2 id="dynamic-component-heading">動的コンポーネント: :is による差し替え</h2>
    <button type="button" @click="isCard = !isCard">
      {{ isCard ? '一覧表示に切り替える' : 'カード表示に切り替える' }}
    </button>

    <!--
      観測したいのは「差し替え後に role と関連付けが引き継がれるか」。

      両ビューは同じ regionId と同じ items を受け取り、同じ規則で見出しの id を
      組み立てる。構造が同じで見せ方だけが変わるため、差し替えで関連付けが
      壊れれば「region の名前が前のビューのまま」「describedby が残る」形で出る。

      Vapor は createDynamicComponent という専用の仕組みで差し替えるので、
      classic の VDOM パッチとは別経路になる。
    -->
    <component :is="current" region-id="dynamic-region" :items="FILES" />
  </section>
</template>
