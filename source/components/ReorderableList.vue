<script setup lang="ts">
import { ref } from 'vue'

interface Row {
  readonly id: number
  readonly label: string
}

const INITIAL_ROWS: readonly Row[] = [
  { id: 1, label: 'Vapor Mode' },
  { id: 2, label: 'Virtual DOM' },
  { id: 3, label: 'Hydration' },
]

const rows = ref<readonly Row[]>(INITIAL_ROWS)
const selectedId = ref<number>(INITIAL_ROWS[0].id)

function select(id: number) {
  selectedId.value = id
}

// 先頭を末尾へ回す。既存配列は書き換えず新しい配列を割り当てる。
// :key を付けているため classic / vapor のどちらも
// 「DOM ノードを再利用しながら並べ替える」経路を通る。
// この経路で aria-posinset / aria-selected が古い値のまま残らないかが
// このシナリオの観測対象。
function rotate() {
  const [first, ...rest] = rows.value
  if (!first) return
  rows.value = [...rest, first]
}

// 削除は aria-setsize の縮みと posinset の振り直しを見るための操作。
function removeFirst() {
  rows.value = rows.value.slice(1)
}
</script>

<template>
  <section aria-labelledby="list-heading">
    <h2 id="list-heading">リスト描画: キー付き v-for の再利用</h2>
    <button type="button" @click="rotate">先頭を末尾へ</button>
    <button type="button" @click="removeFirst">先頭を削除</button>
    <!-- APG の listbox は aria-activedescendant でフォーカスを管理するが、
         ここでは各 option を tabindex で直接辿れる形にしている。
         フォーカス移動そのものは FocusDialog 側で検証済みで、
         このシナリオの観測対象はリスト再利用時の属性更新に絞りたいため。 -->
    <ul role="listbox" aria-labelledby="list-heading">
      <li
        v-for="(row, index) in rows"
        :key="row.id"
        role="option"
        tabindex="0"
        :aria-selected="row.id === selectedId"
        :aria-posinset="index + 1"
        :aria-setsize="rows.length"
        @click="select(row.id)"
        @keydown.enter="select(row.id)"
      >
        {{ row.label }}
      </li>
    </ul>
  </section>
</template>
