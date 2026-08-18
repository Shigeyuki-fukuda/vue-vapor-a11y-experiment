# vue-vapor-a11y-experiment

> **EN** — A verification harness that checks whether Vue 3.6 Vapor Mode breaks accessibility.
> One component source is compiled into two apps, classic (VDOM) and vapor, differing by a single
> line. Their accessibility trees are captured with Playwright's `ariaSnapshot()` and diffed, so any
> difference can only be attributed to Vapor Mode. The full write-up below is in Japanese.

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

classic と vapor の差分は `<script setup>` → `<script setup vapor>` の**1行の置換のみ**。
これにより「観測された差分の原因は Vapor Mode 以外にない」ことを機械的に保証する。

## ディレクトリ構成

```
vue-vapor-a11y-experiment/
├─ package.json
├─ playwright.config.mjs
├─ source/
│  └─ components/            # ← 唯一の編集対象。classic構文で書く
├─ scripts/
│  ├─ sync-vapor.mjs          # vapor属性の付与だけを行い2系統へ展開
│  ├─ smoke-test.mjs          # happy-dom での簡易動作確認
│  └─ diff-snapshots.mjs      # classic vs vapor の差分集計
├─ apps/
│  ├─ classic/                # createApp / 生成物 (直接編集しない)
│  └─ vapor/                  # createVaporApp / 生成物 (直接編集しない)
├─ e2e/
│  ├─ helpers/snapshot.mjs
│  ├─ scenarios/*.spec.mjs
│  └─ snapshots/{classic,vapor}/
└─ results/diff-report.md     # 発表資料の元ネタ
```

## 前提環境

- Node.js 22.x 以上 (20.19+ でも可)
- pnpm 11.x — **npm は使わない**

`vue@3.6.0-rc.3` は semver 上プレリリースのため、npm では `@vitejs/plugin-vue` の
peer dependency `vue@^3.2.25` を満たさないと判定され `ERESOLVE` で失敗する。
pnpm ではこの問題が起きない。

## 使い方

```sh
pnpm install
pnpm run sync            # source/ → apps/{classic,vapor}/src へ展開
pnpm run build:classic
pnpm run build:vapor
pnpm run smoke           # happy-dom での配線チェック
pnpm run test:e2e        # ariaSnapshot 取得 (要 Playwright)
pnpm run diff            # results/diff-report.md を出力
```

## ドキュメント

| ドキュメント | 内容 |
|---|---|
| [docs/adding-scenarios.md](docs/adding-scenarios.md) | 検証項目を増やすときの定型フロー (5手順) |
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

## 検証エビデンス

計測日 2026-08-18 / Node v26.2.0 / pnpm 11.5.0 / vue@3.6.0-rc.3 / vite@8.2.1 /
@vitejs/plugin-vue@6.0.8 / @playwright/test@1.62.1

### バンドルサイズ

5カテゴリ分のコンポーネントを含めた状態での計測。

| 系統 | サイズ | gzip |
|---|---|---|
| classic | 69.65 kB | 27.39 kB |
| vapor | 51.12 kB | 19.64 kB |

Vapor 側は VDOM ランタイムを含まないため gzip で約 28% 小さい。

> 検証項目を増やすとアプリ固有のコードが両系統に等しく積み上がるため、
> ランタイム差の比率は相対的に縮む。1カテゴリのみだった時点では約 37% 差だった。
> 差の絶対値 (gzip 約 7.7 kB) がランタイム由来の削減分にあたる。

### コード生成方式が本当に切り替わっているか

「vapor 属性を付けたつもりが効いていなかった」事故を防ぐため、
minify なしビルドの成果物を grep して確認する。

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

### ariaSnapshot 差分 (全5カテゴリ)

`pnpm run test:e2e && pnpm run diff` の結果、**15スナップショットすべてで
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

### 2系統ソースの差分

```sh
pnpm run sync
diff apps/classic/src/components/LiveRegionToast.vue \
     apps/vapor/src/components/LiveRegionToast.vue
```

```
1c1
< <script setup>
---
> <script setup vapor>
```
