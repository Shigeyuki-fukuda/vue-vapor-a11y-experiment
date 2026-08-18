# 検証項目を増やすときの定型フロー

2項目め以降 (フォーカス管理 / 動的 aria 属性 / フォームエラー / 条件付き描画) は、
毎回この5手順の繰り返し。

| # | 作業 | コマンド / 場所 |
|---|---|---|
| 1 | コンポーネントを classic 構文で追加 | `source/components/ModalDialog.vue` など。`source/components/App.vue` にも追加 |
| 2 | 2系統へ展開 | `pnpm run sync` |
| 3 | 動作の目視確認 | `pnpm run dev:classic` / `pnpm run dev:vapor` を並べて開く |
| 4 | シナリオ追加 → スナップショット取得 | `e2e/scenarios/<名前>.spec.mjs` を既存からコピーして作成 → `pnpm run test:e2e && pnpm run diff` |
| 5 | `docs/voiceover-procedure.md` に項目追加 → 結果を記録 | `results/voiceover-log.md` |

## 1. コンポーネントの追加

`source/components/` が唯一の編集対象。**`apps/*/src` は絶対に触らない**
(sync の生成物であり、直接編集すると2系統の同一性が壊れる)。

Vapor は Options API / Suspense を対象外とするため、
検証コンポーネントは `<script setup>` + Composition API のみで書く。

### フォーカス管理を扱うときの注意

`ref` への `focus()` は **`await nextTick()` 後に行う実装で統一する**。

```js
import { nextTick, ref } from 'vue'

const dialogRef = ref(null)

async function open() {
  isOpen.value = true
  await nextTick()
  dialogRef.value?.focus()
}
```

ここで `setTimeout` などタイミング依存の書き方をすると、観測された差分が
「Vapor 起因」なのか「実装起因」なのか切り分けられなくなる。
検証の結論そのものが無意味になるため、例外を作らない。

## 4. シナリオの追加

既存の `e2e/scenarios/live-region.spec.mjs` をコピーして書き換えるのが早い。
守るべき点は2つ。

1. **スナップショット前に必ず状態確定を待つ** — `expect(...).toHaveText()` などで
   待ってから `ariaSnapshot()` を呼ぶ。待たないと「取得タイミング由来」の
   差分がノイズとして出る。
2. **ファイル名を `<シナリオ>.<時点>.yaml` に揃える** — `saveSnapshot()` の
   第2引数がシナリオ名、第3引数のキーが時点になる。比較するのは
   「classic の before vs vapor の before」「after 同士」であり、
   同系統内の before/after 比較ではない。

## 検証カテゴリのロードマップ

| カテゴリ | 検証したいこと | 状態 |
|---|---|---|
| live region | `role=status` の動的更新が支援技術に伝わるか | ✅ W1 完了 |
| フォーカス管理 | モーダル開閉時のフォーカス移動・復帰 | 未着手 |
| 動的 aria 属性 | `aria-expanded` / `aria-selected` の更新 | 未着手 |
| フォームエラー | `aria-invalid` / `aria-describedby` の紐付け | 未着手 |
| 条件付き描画 | `v-if` / `v-show` によるツリーの出入り | 未着手 |
