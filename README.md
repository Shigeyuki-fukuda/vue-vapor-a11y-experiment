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

## 検証エビデンス

計測日 2026-08-16 / Node v26.2.0 / pnpm 11.5.0 / vue@3.6.0-rc.3 / vite@8.2.1 / @vitejs/plugin-vue@6.0.8

### バンドルサイズ

| 系統 | サイズ | gzip |
|---|---|---|
| classic | 64.30 kB | 25.22 kB |
| vapor | 41.24 kB | 15.79 kB |

Vapor 側は VDOM ランタイムを含まないため gzip で約 37% 小さい。

### コード生成方式が本当に切り替わっているか

「vapor 属性を付けたつもりが効いていなかった」事故を防ぐため、
minify なしビルドの成果物を grep して確認する。

```sh
pnpm exec vite build --config apps/vapor/vite.config.mjs --minify false
pnpm exec vite build --config apps/classic/vite.config.mjs --minify false

grep -oE 'template\("[^"]*"|setText|VaporComponent' apps/vapor/dist/assets/*.js | sort -u
grep -oE 'createElementBlock|createVNode|openBlock' apps/classic/dist/assets/*.js | sort -u
```

実際の出力:

```
vapor 側:   VaporComponent
            setText
            template("<main><h1>Vapor A11y Lab"
            template("<section aria-labelledby=toast-heading><h2 id=toast-heading>...")

classic 側: createElementBlock
            createVNode
            openBlock
```

vapor 側は HTML 文字列テンプレート + 直接 DOM 操作 (`template()` / `setText`)、
classic 側は VNode 生成 (`createVNode`) — 2系統が意図通り別のコンパイル戦略に
なっていることの証拠。

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
