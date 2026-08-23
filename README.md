# vue-vapor-a11y-experiment

> **EN** — A verification harness that checks whether Vue 3.6 Vapor Mode breaks accessibility.
> One component source is compiled into two apps, classic (VDOM) and vapor, from byte-identical
> sources that differ only in a build flag. Their accessibility trees are captured with Playwright's
> `ariaSnapshot()` and diffed, so any difference can only be attributed to Vapor Mode. A guard script
> verifies that the two apps really were compiled by different strategies. The full write-up below is
> in Japanese.

Vue 3.6 の **Vapor Mode** でアクセシビリティが壊れないかを検証するためのリポジトリ。

同一のコンポーネントソースを classic (VDOM) / vapor (Vapor Mode) の2系統へ展開し、
Playwright の `ariaSnapshot()` でアクセシビリティツリーを取得して差分を比較する。

> **Vue Fes Japan 2026** 発表「Vapor Modeでアクセシビリティは壊れないか検証した話」の資料。
> スライドで述べる主張の裏付けとなる検証コード・計測結果・読み上げ記録を一式まとめたもの。
> 登壇者ページ: https://vuefes.jp/2026/speaker/Shigeyuki-fukuda

## 設計原則

手で編集するのは `source/components/` と `e2e/scenarios/` だけ。
`apps/*/src/App.vue` と `apps/*/src/components/` は `pnpm run sync` の生成物であり、
直接編集しない (編集すると2系統の同一性が壊れるため `.gitignore` 済み)。

**2系統のコンポーネントソースはバイト単位で完全に同一。** Vapor Mode の指定は
Vite 設定側にあり、コンポーネントには一切現れない。意図的な差分は次の2点だけで、
いずれも `pnpm run verify` が機械的に検証する。

| 差分 | 場所 |
|---|---|
| コンパイルモード | `scripts/lanes.mjs` の `vapor` フラグ → `@vitejs/plugin-vue` の `features.vapor` |
| マウント関数 | `apps/{lane}/src/main.js` の `createApp` / `createVaporApp` |

これにより「観測された差分の原因は Vapor Mode 以外にない」ことを機械的に保証する。

> 以前は vapor 側だけ `<script setup>` を `<script setup vapor>` に文字列置換していた。
> 置換は完全一致に依存するため、例えば `lang="ts"` を付けた途端に無言で不一致になり、
> vapor 側が classic としてビルドされて「差分なし」という偽の成功を出す危険があった。
> `features.vapor` はプラグインレベルの強制スイッチで、判定条件は
> `<script setup>` の有無のみ。`lang="ts"` に依存しない。

### 検証を成立させる3つのガード

`pnpm run verify` が以下を確認し、1つでも崩れていれば非ゼロ終了する。

| # | 検証内容 | 防ぐ事故 |
|---|---|---|
| 1 | 2系統のコンポーネントソースがバイト単位で同一 | 片方だけ編集し、差分の原因を Vapor だと取り違える |
| 2 | ビルド設定と entry が lane のあるべき姿と一致 | 設定を間違えたまま比較して気付かない |
| 3 | ビルド成果物が意図したコンパイル戦略で生成されている | プラグインが指定を無視し、classic 同士を比較する |

3 の判定は **minify 済みの成果物**に対して行う。マーカーは文字列リテラルと
オブジェクトキーなので、識別子と違って minify で消えない。

| lane | HTML 文字列テンプレート (Vapor) | VNode props (VDOM) |
|---|---|---|
| classic | 0 | 16 |
| vapor | 9 | 0 |

どちらの方向も見ているため、「Vapor になっていない」と「VDOM が混入した」の
両方を検出できる。0 件はマーカー自体が陳腐化した場合にも起きるので、
その場合も失敗させて黙って通り抜けないようにしている。

**期待値は `scripts/verify-vapor-mode.mjs` が `scripts/lanes.mjs` とは独立に宣言している。**
lanes.mjs を参照して期待値を組み立てると、lanes.mjs の設定ミスを
「設定どおりだから正しい」と判定してしまう (この穴は実測で確認した。
`features.vapor` を false に倒したのに検証が通ってしまった)。
検証の期待値は被検証対象から独立していなければならない。

## ディレクトリ構成

```
vue-vapor-a11y-experiment/
├─ package.json
├─ playwright.config.mjs
├─ tsconfig.json              # 型チェックの対象は配布後の apps/*/src (理由は同ファイル内)
├─ source/
│  └─ components/            # ← 唯一の編集対象。2系統に同一のものが配られる
├─ scripts/
│  ├─ lanes.mjs               # 2系統のビルド設定 (vapor フラグ / dev ポート)
│  ├─ sources.mjs             # 配布先の解決と「2系統が同一」の検証
│  ├─ sync-sources.mjs        # source/ を2系統へ配布 (変換は一切しない)
│  ├─ verify-vapor-mode.mjs   # 成果物と entry が意図通りかを検証
│  ├─ smoke-test.mjs          # happy-dom での簡易動作確認
│  └─ diff-snapshots.mjs      # classic vs vapor の差分集計
├─ apps/
│  ├─ vite.config.base.mjs    # 両系統の Vite 設定を生成するファクトリ
│  ├─ classic/                # createApp / src 配下は生成物 (直接編集しない)
│  └─ vapor/                  # createVaporApp / src 配下は生成物 (同上)
├─ e2e/
│  ├─ helpers/snapshot.mjs
│  ├─ scenarios/*.spec.mjs
│  └─ snapshots/{classic,vapor}/
└─ results/diff-report.md     # 発表資料の元ネタ
```

`apps/*/vite.config.mjs` は `createLaneConfig('classic')` を呼ぶだけの1行。
設定を2ファイルに手で書き分けないことで、「片方だけに加えた変更」が
差分の原因になり得ない構造にしている。

## 前提環境

- Node.js 22.x 以上 (20.19+ でも可)
- pnpm 11.x — **npm は使わない**

`vue@3.6.0-rc.3` は semver 上プレリリースのため、npm では `@vitejs/plugin-vue` の
peer dependency `vue@^3.2.25` を満たさないと判定され `ERESOLVE` で失敗する。
pnpm ではこの問題が起きない。

## 使い方

```sh
pnpm install
pnpm exec playwright install chromium   # 初回のみ
pnpm run check                          # 下記を通しで実行する
```

`check` の内訳。個別に実行してもよい。

```sh
pnpm run sync            # source/ → apps/{classic,vapor}/src へ配布
pnpm run typecheck       # vue-tsc で両 lane の配布済みソースを型チェック
pnpm run build           # 2系統をビルド (build:classic / build:vapor も個別に可)
pnpm run verify          # 3つのガードを検証 ★これを通さない結果は信用しない
pnpm run smoke           # happy-dom での配線チェック
pnpm run test:e2e        # ariaSnapshot 取得 (要 Playwright)
pnpm run diff            # results/diff-report.md を出力
```

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [docs/manual-verification.html](docs/manual-verification.html) | 手動での検証手順と VoiceOver 検証手順 (ブラウザで開く) |
| [docs/adding-scenarios.md](docs/adding-scenarios.md) | 検証項目を増やすときの定型フロー |
| [docs/voiceover-procedure.md](docs/voiceover-procedure.md) | VoiceOver 検証の手順 (macOS) |
| [docs/troubleshooting.md](docs/troubleshooting.md) | トラブルシューティング |
| [results/diff-report.md](results/diff-report.md) | ariaSnapshot 差分レポート (自動生成) |
| [results/voiceover-log.md](results/voiceover-log.md) | VoiceOver 読み上げ記録 |

## 検証カテゴリ

| カテゴリ | 検証内容 | シナリオ | 差分 |
|---|---|---|---|
| live region | `role=status` の動的更新 | [live-region](e2e/scenarios/live-region.spec.mjs) | ✅ なし |
| フォーカス管理 | モーダル開閉時のフォーカス移動・復帰 | [focus-management](e2e/scenarios/focus-management.spec.mjs) | ✅ なし |
| 動的 aria 属性 | `aria-expanded` の更新 | [dynamic-aria](e2e/scenarios/dynamic-aria.spec.mjs) | ✅ なし |
| フォームエラー | `aria-invalid` / `aria-describedby` の紐付け | [form-error](e2e/scenarios/form-error.spec.mjs) | ✅ なし |
| 条件付き描画 | `v-if` / `v-show` によるツリーの出入り | [conditional-render](e2e/scenarios/conditional-render.spec.mjs) | ✅ なし |
| リスト描画 | キー付き `v-for` の並べ替え・削除で `aria-selected` / `aria-posinset` / `aria-setsize` が追随するか | [list-reorder](e2e/scenarios/list-reorder.spec.mjs) | ✅ なし |

## 検証範囲の限界

この検証が扱っているのは **単一コンポーネント内の静的/動的 aria 属性**であり、
以下は未検証。「Vapor Mode でアクセシビリティは壊れない」と述べる際は
この範囲を明示する必要がある。

| 未検証の領域 | 差分が出うる理由 |
|---|---|
| props / slots によるコンポーネント合成 | 親から渡した id で `aria-labelledby` を張る構成が保たれるか |
| `<Teleport>` | モーダルを body 直下へ移したときに `aria-modal` とフォーカストラップが機能するか |
| `<Transition>` | アニメーション中の要素がアクセシビリティツリーに残留しないか |
| SSR / hydration | Vapor の hydration は独立実装。属性欠落が起きるならここ |
| 動的コンポーネント (`:is`) | 差し替え時に role や関連付けが引き継がれるか |

`source/components/` は現時点で `defineProps` / `defineEmits` / `withDefaults` /
`defineModel` / `<Teleport>` / `<Transition>` / `<Suspense>` / `:is` /
`provide` / `inject` をいずれも使っていない。

> `v-for` はこの表から外れた。リスト描画は検証済み
> ([list-reorder](e2e/scenarios/list-reorder.spec.mjs))。詳細は
> 「[キー付き `v-for` の再利用](#キー付き-v-for-の再利用)」。

### TypeScript 化の影響 (実測)

`source/components/` は `<script setup lang="ts">` で書いている。
TS 化が結論に影響しないことは推論ではなく実測で確認した。

下表は TS 化を入れた時点 (5カテゴリ / 15スナップショット) の実測値。
`v-for` を追加した現在の値ではない。

| 観点 | 結果 |
|---|---|
| Vapor 判定 | 壊れない。3層すべて ✅ (HTML文字列テンプレート 7 / VNode props 0) |
| aria 出力 | 15スナップショットすべて**1バイトも変化しない** |
| 生成コード | lane 相応のラッパが1段増える (下記) |
| バンドルサイズ | gzip で classic +0.05 kB / vapor +0.03 kB |

`lang="ts"` を付けると `@vitejs/plugin-vue` が SFC をラッパ関数で包む。
**このラッパは lane ごとに別のものが選ばれる。**

| lane | JS のとき | TS のとき |
|---|---|---|
| classic | `var _sfc_main = { setup(…) }` | `defineComponent({ setup(…) })` |
| vapor | `var _sfc_main = { setup(…), __vapor: true }` | `defineVaporComponent({ setup(…) })` |

vapor 側で注目すべきは `__vapor: true` の付き方が変わる点。JS ではオブジェクト
リテラルに直接書かれていたものが、TS では `defineVaporComponent` が実行時に
付与する形になる。**それでも Vapor マーキングは失われていない**ことを
`pnpm run verify` と `pnpm run smoke` が確認している。ここが失われると
vapor コンポーネントが classic として扱われ、比較そのものが成立しなくなる。

増加分はこのラッパ関数の実体。テンプレートコンパイラの出力
(`template()` に焼き込まれた aria 属性) は TS 化前後で完全に同一だった。

型ベースマクロ (`defineProps<T>()` など) は依然として1つも使っていないため、
上表の「props / slots によるコンポーネント合成」は未検証のまま。
ビルド設定とハーネスの `.mjs` はブラウザに読み込まれないため成果物に影響しない。

#### 型チェックが実際に効いていることの確認

`pnpm run typecheck` (vue-tsc) を `check` に組み込んでいる。通っていることと
機能していることは別なので、意図的に型エラーを注入して確認した。

```sh
# dialogRef.value?.focus() を存在しないメソッドに書き換えて sync した状態
pnpm run typecheck
```

```
apps/classic/src/components/FocusDialog.vue(16,20): error TS2339: Property 'focusTypo' does not exist on type 'HTMLDivElement'.
apps/vapor/src/components/FocusDialog.vue(16,20): error TS2339: Property 'focusTypo' does not exist on type 'HTMLDivElement'.
```

両 lane から出ている点が重要で、`tsconfig.json` が片方だけを拾って
「通ったことにする」状態になっていないことを示している。

## 検証エビデンス

計測日 2026-08-22 / Node v26.2.0 / pnpm 11.22.0 / vue@3.6.0-rc.3 / vite@8.2.1 /
@vitejs/plugin-vue@6.0.8 / @playwright/test@1.62.1 / typescript@5.9.3 / vue-tsc@3.3.11

### バンドルサイズ

6カテゴリ分のコンポーネントを含めた状態での計測 (`<script setup lang="ts">`)。

| 系統 | サイズ | gzip |
|---|---|---|
| classic | 71.48 kB | 28.07 kB |
| vapor | 59.29 kB | 22.72 kB |

Vapor 側は VDOM ランタイムを含まないため gzip で約 19% 小さい。

#### Vapor のサイズ優位は「使う機能」で縮む

カテゴリを増やすたびに削減率が落ちている。これはアプリ固有コードが
両系統に等しく積み上がるからだけではない。

| 時点 | gzip 削減率 | gzip 差の絶対値 |
|---|---|---|
| 1カテゴリ | 約 37% | — |
| 5カテゴリ | 28.3% | 7.77 kB |
| 6カテゴリ (`v-for` 追加) | 19.1% | 5.35 kB |

**差の絶対値そのものが縮んでいる**点が重要。アプリコードが等しく積み上がる
だけなら比率は縮んでも絶対値は変わらないはずで、これは Vapor 側だけが
余分に太ったことを意味する。`v-for` 1つを追加したときの増分は
gzip で classic +0.63 kB に対し **vapor +3.05 kB**。

原因は Vapor が `v-for` 用のランタイムを新たに引き込むため。
minify なしの成果物を 5カテゴリ時点と diff すると、vapor 側にだけ以下が現れる。

```
createFor / ForBlock / ForFragment / insertForBlock / removeForBlock
watch / shallowRef / traverse / onWatcherCleanup / createSelector
```

`createFor` が内部で `watch` を使うため、reactivity 側の `watch` と
その依存 (`traverse` など) までバンドルに入る。classic 側は VDOM の汎用
パッチ機構が最初から入っているので、リスト描画を1つ増やしても増分が小さい。

> つまり「Vapor は gzip で N% 小さい」という数字は、**アプリが Vapor の
> どの機能を使うかに依存する**。発表で数字を出すときは計測時点の
> 機能セットを併記しないと誤解を招く。

### コード生成方式が本当に切り替わっているか

日常的にはこれだけでよい。通常ビルドの成果物をそのまま判定する。

```sh
pnpm run verify
```

```
✅ 全 lane のソースがバイト単位で同一 (7 files)

| lane | 期待 vapor | 期待マウント関数 | HTML文字列テンプレート | VNode props | 判定 |
|---|---|---|---|---|---|
| classic | false | createApp | 0 | 16 | ✅ OK |
| vapor | true | createVaporApp | 9 | 0 | ✅ OK |

✅ 両 lane が意図どおり別のコンパイル戦略でビルドされています
```

生成コードそのものを読みたい場合は minify なしでビルドして grep する。

```sh
pnpm exec vite build --config apps/vapor/vite.config.mjs --minify false
pnpm exec vite build --config apps/classic/vite.config.mjs --minify false

grep -oE 'template\("[^"]{0,40}|setText|setAttr|VaporComponent|createIf' \
  apps/vapor/dist/assets/*.js | sort -u
grep -oE 'createElementBlock|createVNode|openBlock|toDisplayString' \
  apps/classic/dist/assets/*.js | sort -u
```

実際の出力:

```
vapor 側:   VaporComponent
            createIf
            setAttr
            setText
            template("<div role=dialog aria-modal=true aria-la
            template("<main><h1>Vue Vapor A11y Experiment
            template("<p id=email-error role=alert> メールアドレスの形式
            template("<p>v-if で出し入れされる補足
            template("<section aria-labelledby=conditional-hea
            template("<section aria-labelledby=disclosure-head
            template("<section aria-labelledby=focus-heading><
            template("<section aria-labelledby=form-heading><h
            template("<section aria-labelledby=toast-heading><

classic 側: createElementBlock
            createVNode
            openBlock
            toDisplayString
```

vapor 側は HTML 文字列テンプレート + 直接 DOM 操作 (`template()` / `setText` /
`setAttr`)、条件分岐は `createIf`。classic 側は VNode 生成 (`createVNode`) と
`toDisplayString` — 2系統が意図通り別のコンパイル戦略になっていることの証拠。

`aria-modal` や `role=alert` が **`template()` の静的文字列に焼き込まれている**点も
重要で、Vapor では静的な aria 属性が VNode を経由せず HTML として直接出力される。

> `--minify false` の成果物はサイズが大きく、そのままだと
> バンドルサイズの計測値としては使えない。観察が終わったら
> `pnpm run build` で通常ビルドに戻す。

### ariaSnapshot 差分 (全6カテゴリ)

`pnpm run test:e2e && pnpm run diff` の結果、**23スナップショットすべてで
classic と vapor のアクセシビリティツリーが完全一致 (差分 0 件)**。

```
- main:
  - heading "Vue Vapor A11y Experiment" [level=1]
  - 'region "Live Region: トースト通知"':
    - 'heading "Live Region: トースト通知" [level=2]'
    - button "保存"
    - status: 保存しました
  - 'region "フォーカス管理: モーダルダイアログ"':
    - 'heading "フォーカス管理: モーダルダイアログ" [level=2]'
    - button "設定を開く"
    - dialog "表示設定":
      - heading "表示設定" [level=3]
      - button "閉じる"
  - 'region "動的 aria 属性: 開閉パネル"':
    - 'heading "動的 aria 属性: 開閉パネル" [level=2]'
    - button "コンパイル結果の詳細" [expanded]
    - paragraph: Vapor Mode は VDOM を経由せず DOM を直接更新する。
  - 'region "フォームエラー: 入力検証"':
    - 'heading "フォームエラー: 入力検証" [level=2]'
    - text: メールアドレス
    - textbox "メールアドレス" [invalid]: not-an-email
    - alert: メールアドレスの形式が正しくありません
    - button "送信"
  - 'region "リスト描画: キー付き v-for の再利用"':
    - 'heading "リスト描画: キー付き v-for の再利用" [level=2]'
    - button "先頭を末尾へ"
    - button "先頭を削除"
    - 'listbox "リスト描画: キー付き v-for の再利用"':
      - option "Vapor Mode"
      - option "Virtual DOM"
      - option "Hydration" [selected]
```

比較の向きは「classic の同一時点 vs vapor の同一時点」。
同系統内の before/after 比較ではない。
詳細は [results/diff-report.md](results/diff-report.md) を参照。

#### フォーカス位置の扱い

`ariaSnapshot()` の出力にフォーカス位置は含まれない。そのため
フォーカス管理シナリオでは `:focus` 要素のアクセシビリティ表現を
`focus-opened` / `focus-closed` という別時点として保存し、これも比較対象にしている。

```
focus-opened:              focus-closed:
- dialog "表示設定":         - button "設定を開く"
  - heading "表示設定" [level=3]
  - button "閉じる"
```

ダイアログを開くとダイアログ自身へ、閉じると呼び出し元のボタンへフォーカスが
戻る挙動が、2系統で一致していることを示す。

#### キー付き v-for の再利用

Vapor のリスト差分アルゴリズムは VDOM と別実装で、**行を再利用する際に
`aria-selected` / `aria-posinset` が古い値のまま残る**余地がある。
ここが最も差分を疑っていた領域。

`ariaSnapshot()` は `option "Hydration" [selected]` のように選択状態は出すが、
`aria-posinset` / `aria-setsize` のような数値属性は出さない。**観測対象が
スナップショットから抜け落ちる**ため、これらはフォーカス位置と同じ扱いで
別時点として保存している (`*-attrs`)。

実測 (classic / vapor 完全一致)。3件目を選択した状態から操作している。

```
selected  → 先頭を末尾へ                → 先頭を削除
Vapor Mode  1/3 false     Virtual DOM 1/3 false    Hydration  1/2 true
Virtual DOM 2/3 false     Hydration   2/3 true     Vapor Mode 2/2 false
Hydration   3/3 true      Vapor Mode  3/3 false
                          ^ 選択が 3番目→2番目に追随    ^ setsize が 3→2 に縮む
```

##### このシナリオが空振りしていないことの確認

ノードが毎回作り直される実装なら「行を再利用する際に古い属性が残る」
失敗モードをそもそも通らず、差分ゼロが自動的に出てしまう。そこで初期描画
直後に DOM ノードへテスト側から通し番号 (`data-probe`) を振り、並べ替え後に
印がどこにいるかも時点として保存している。

```
initial                                        rotated
- Vapor Mode:  posinset=1 selected=true  probe=0   - Virtual DOM: posinset=1 probe=1
- Virtual DOM: posinset=2 selected=false probe=1   - Hydration:   posinset=2 probe=2
- Hydration:   posinset=3 selected=false probe=2   - Vapor Mode:  posinset=3 probe=0
                                                                              ^ 印が行と一緒に移動
```

印が行と一緒に移動しているので、**両 lane とも DOM ノードを再利用しながら
並べ替えている**。つまり狙った失敗モードを実際に通ったうえで、
`aria-posinset` / `aria-selected` が正しく更新されている。

`data-*` 属性はアクセシビリティツリーに現れないため、ariaSnapshot 側の
出力には影響しない。

### 2系統ソースの差分

差分は存在しない。同一であることをスクリプトが検証している。

```sh
pnpm run sync
diff -r apps/classic/src/components apps/vapor/src/components
```

```
(出力なし)
```

コンポーネント以外で lane ごとに異なるのは entry の `main.js` (マウント関数) と
`index.html` の `<title>` (`classic` / `vapor`) のみ。前者は `pnpm run verify` が
検証しており、後者は VoiceOver 検証でどちらのタブを操作しているかを
区別するために意図的に残している。
