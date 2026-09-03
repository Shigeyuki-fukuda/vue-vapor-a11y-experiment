# 検証項目を増やすときの定型フロー

2項目め以降 (フォーカス管理 / 動的 aria 属性 / フォームエラー / 条件付き描画) は、
毎回この5手順の繰り返し。

| # | 作業 | コマンド / 場所 |
|---|---|---|
| 1 | コンポーネントを追加 | `source/components/ModalDialog.vue` など。`source/components/App.vue` にも追加 |
| 2 | 2系統へ配布 → 型チェック | `pnpm run sync && pnpm run typecheck` |
| 3 | 動作の目視確認 | `pnpm run dev:classic` / `pnpm run dev:vapor` を並べて開く |
| 4 | シナリオ追加 → スナップショット取得 | `e2e/scenarios/<名前>.spec.mjs` を既存からコピーして作成 → `pnpm run check` |
| 5 | `docs/voiceover-procedure.md` に項目追加 → 結果を記録 | `results/voiceover-log.md` |

手順4の `pnpm run check` は配布・型チェック・ビルド・ガード検証・スモーク・E2E・
差分集計を通しで実行する。個別に回す場合も、**差分を読む前に必ず
`pnpm run verify` を通す**。
Vapor モードが効いていない状態では差分ゼロが自動的に出てしまうため、
verify を通していない「差分なし」は結果として扱えない。

**生成された `e2e/snapshots/{classic,vapor}/*.yaml` は PR に含める。**
CI が再生成した内容とコミット済みの内容を突き合わせており、記録が無いと
「両 lane が揃って変わった」変化 (依存更新など) を誰も検出できない。
`pnpm run diff` が見ているのは lane 同士の食い違いだけで、この軸は別物。
新規ファイルの入れ忘れも CI で落ちる (未追跡ファイルまで検査対象)。

## 1. コンポーネントの追加

`source/components/` が唯一の編集対象。**`apps/*/src` は絶対に触らない**
(sync の生成物であり、直接編集すると2系統の同一性が壊れる)。

Vapor は Options API / Suspense を対象外とするため、
検証コンポーネントは `<script setup lang="ts">` + Composition API のみで書く。

見出しは `<カテゴリ>: <題材>の検証` で揃える
(例: `Teleport: body 直下へ移すダイアログの検証`)。
**この文字列は `aria-labelledby` でリージョンのアクセシブルネームになり、
全スナップショットと E2E のロケータに現れる。** 後から変えると 57 件の
スナップショットと手順書 3 種を一緒に直すことになるので、最初に決めておく。

`lang="ts"` を落とすと生成コードが変わる (ラッパ関数の有無) ため、
既存コンポーネントと同じ条件で比較できなくなる。詳細は
[../README.md](../README.md) の「TypeScript 化の影響 (実測)」を参照。

template ref は要素型を明示する。

```ts
const dialogRef = ref<HTMLDivElement | null>(null)
```

`ref(null)` のままでは `focus()` の存在が型検査されず、実装ミスが
「Vapor 起因の差分」に見えてしまう。

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
守るべき点は3つ。

1. **lane の URL を書かない** — `TARGETS` を回して `openLane()` で開く。

   ```js
   import { TARGETS, openLane } from '../helpers/targets.mjs'

   for (const t of TARGETS) {
     test(`… — ${t.name}`, async ({ page }) => {
       await openLane(page, t)
   ```

   ポート番号を spec に書き写すと、`{ name: 'vapor', url: '…:4173' }` のような
   打ち間違いが**落ちずに通る**。classic のツリーが vapor として保存され、
   classic 同士の比較になって必ず「差分なし」が出る。
   `openLane()` は開いた先の lane 帯 (`data-lane`) が `t.name` と
   一致することも確かめる。
2. **スナップショット前に必ず状態確定を待つ** — `expect(...).toHaveText()` などで
   待ってから `ariaSnapshot()` を呼ぶ。待たないと「取得タイミング由来」の
   差分がノイズとして出る。
3. **ファイル名を `<シナリオ>.<時点>.yaml` に揃える** — `saveSnapshot()` の
   第2引数がシナリオ名、第3引数のキーが時点になる。比較するのは
   「classic の before vs vapor の before」「after 同士」であり、
   同系統内の before/after 比較ではない。

   シナリオ名は **spec のファイル名と一致させる**。`pnpm run diff` が
   `e2e/scenarios/<シナリオ>.spec.mjs` の存在を突き合わせており、
   対応する spec の無いスナップショットが残っていると失敗する
   (消したシナリオの古い記録が、両 lane に揃っている限り一致し続けて
   件数を水増しするのを防ぐため)。

## 検証カテゴリのロードマップ

| カテゴリ | 検証したいこと | 状態 |
|---|---|---|
| live region | `role=status` の動的更新が支援技術に伝わるか | ✅ W1 完了 |
| フォーカス管理 | モーダル開閉時のフォーカス移動・復帰 | ✅ 完了 |
| 動的 aria 属性 | `aria-expanded` の更新 | ✅ 完了 |
| フォームエラー | `aria-invalid` / `aria-describedby` の紐付け | ✅ 完了 |
| 条件付き描画 | `v-if` / `v-show` によるツリーの出入り | ✅ 完了 |
| リスト描画 | キー付き `v-for` の並べ替え・削除で `aria-selected` / `aria-posinset` / `aria-setsize` が追随するか | ✅ 完了 |
| コンポーネント合成 | props で渡した id による関連付けが境界を越えて保たれるか、slot の描画位置 | ✅ 完了 |
| Teleport | `body` 直下へ移した後の `aria-modal` と template ref | ✅ 完了 |
| Transition | leave 中の要素がツリーに残留するか | ✅ 完了 |
| 動的コンポーネント | `:is` の差し替えで role が保たれ、古い関連付けが残らないか | ✅ 完了 |
| SSR / hydration | サーバ描画した HTML を独立実装の hydration で引き継いでもツリーが保たれるか | ✅ 完了 |

ariaSnapshot 差分はいずれも 0 件。VoiceOver での読み上げ検証は
[../results/voiceover-log.md](../results/voiceover-log.md) が未記入のため残っている。

### 次に増やすなら

README「検証範囲の限界」に挙げていた領域はすべて検証済みになった。
残るのは **VoiceOver での読み上げ記録** で、こちらは実機が要る。

`aria-live="assertive"` と `polite` の読み上げ差など、既存カテゴリを
細分化する方向であればこのフローに乗る。

### SSR のシナリオだけは前提が違う

[ssr-hydration](../e2e/scenarios/ssr-hydration.spec.mjs) は `/ssr.html` を開く。
他のシナリオが見ている `index.html` (クライアント描画) とは別ページで、
`pnpm run build` に SSR ビルドと prerender が含まれていないと成立しない。

このシナリオを触るときは、**#app が空でないことの確認を外さない**。
prerender が効いていないと `<div id="app"></div>` が空のまま配信され、
hydration ではなく通常のクライアント描画を見ることになる。
それでもテストは通り差分 0 件が出るため、空振りに気付けない。

## ボタン文言に既存の名前を含めない

Playwright の `getByRole` の `name` は**部分一致**で照合する。
新しいボタンに既存ボタンの名前が丸ごと含まれると、既存 spec のロケータが
両方に当たって strict mode violation で落ちる。

```
既存: 設定を開く
追加: 通知設定を開く   ← 「設定を開く」を含むので既存 spec が壊れる
```

実際にこれで `focus-management` が落ちた。追加時は既存の文言一覧と
突き合わせて、包含関係が生まれないことを確かめる。

```sh
grep -hoE '>[^<>]*</button>' source/components/*.vue
```

同じ文言が複数あっても、**同時に DOM へ出ない**なら衝突しない
(`閉じる` は2つのダイアログが持つが、片方ずつしか開かない)。

## フォーカス位置をスナップショットに残す

`ariaSnapshot()` の出力にフォーカス位置は含まれない。
フォーカスを検証する項目では、ツリーとは別に `:focus` 要素の
アクセシビリティ表現を時点として保存する。

```js
const focusOpened = await page.locator(':focus').ariaSnapshot()

saveSnapshot(t.name, 'focus-management', {
  opened,
  'focus-opened': focusOpened,   // → focus-management.focus-opened.yaml
})
```

`diff-snapshots.mjs` はファイル名単位で classic / vapor を突き合わせるため、
時点を増やせばそのまま比較対象に加わる。スクリプト側の変更は不要。

なお初期状態のようにフォーカスが `body` にある時点では `:focus` が
どの要素にもマッチしないため、時点として記録しない。

## ariaSnapshot が出さない属性をスナップショットに残す

`ariaSnapshot()` が出すのは role / アクセシブルネームと一部の状態だけ。
**関連付けを表す属性は出力に現れない。** 観測対象がスナップショットから
抜け落ちていることに気付かないまま「差分なし」を出すのが一番危ない。

| 属性 | ariaSnapshot での扱い |
|---|---|
| `aria-expanded` | `button "…" [expanded]` として出る |
| `aria-invalid` | `textbox "…" [invalid]` として出る |
| `aria-selected` | `option "…" [selected]` として出る |
| `aria-modal` | **出ない** |
| `aria-controls` | **出ない** |
| `aria-describedby` | **出ない** (参照先の要素は `alert:` として出る) |
| `aria-posinset` / `aria-setsize` | **出ない** |

**新しい属性を使うシナリオを足すときは、まずこの表を見る。**
載っていない属性は自分で確かめる。一度スナップショットを取って
`grep -r aria-foo e2e/snapshots/` してみるのが早い。

フォーカス位置と同じ扱いで、出ない属性は別時点として保存する。

```js
import { saveSnapshot, snapshotAttributes } from '../helpers/snapshot.mjs'

const attrs = await snapshotAttributes(page.getByRole('option'), [
  'aria-posinset',
  'aria-setsize',
  'aria-selected',
])

saveSnapshot(t.name, 'list-reorder', {
  selected,
  'selected-attrs': attrs,   // → list-reorder.selected-attrs.yaml
})
```

出力は要素の出現順どおり。並べ替えでは順序そのものが観測対象なのでソートしない。

### そのシナリオが空振りしていないかも確認する

差分ゼロは「壊れていない」だけでなく「**そもそも壊れうる経路を通っていない**」
ときにも出る。リスト再利用の検証がその典型で、ノードが毎回作り直される実装なら
「古い aria 属性が残る」失敗モードを通らない。

初期描画直後に DOM ノードへテスト側から印を振り、操作後にその印がどこにいるかを
時点として保存すれば、再利用が起きたことを確認できる。

```js
await options.evaluateAll((els) => {
  els.forEach((el, index) => { el.dataset.probe = String(index) })
})
```

`data-*` 属性はアクセシビリティツリーに現れないので ariaSnapshot 側は汚れない。
実例は [../e2e/scenarios/list-reorder.spec.mjs](../e2e/scenarios/list-reorder.spec.mjs)。
