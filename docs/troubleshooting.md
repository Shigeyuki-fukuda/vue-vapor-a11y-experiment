# トラブルシューティング

実際に踏んだものを含む。

## `npm install` が ERESOLVE で失敗する

**原因**: `vue@3.6.0-rc.3` は semver 上プレリリース。npm はプレリリースを
`@vitejs/plugin-vue` の peer dependency `vue@^3.2.25` の範囲外と判定する。

**対処**: pnpm を使う。この構成では pnpm なら警告すら出ずに解決できる。
どうしても npm を使う場合は `--legacy-peer-deps` が必要。

## vapor 側の挙動が classic と全く同じで、差分がゼロすぎる

**原因**: `vapor` 属性が効いていない可能性。

**対処**: minify なしビルドの成果物を grep して、コード生成方式が実際に
切り替わっているか確認する。

```sh
pnpm exec vite build --config apps/vapor/vite.config.mjs --minify false
grep -oE 'template\("[^"]*"|setText|VaporComponent' apps/vapor/dist/assets/*.js | sort -u
```

vapor 側に `VaporComponent` / `setText` / `template("...")` が出れば正しく
切り替わっている。出ずに `createVNode` が出るなら vapor 属性が効いていない。

## Vapor 化したコンポーネントがエラーになる

**原因**: Options API / Suspense は Vapor の対象外。

**対処**: 検証コンポーネントは `<script setup>` + Composition API のみで書く。

## ariaSnapshot が classic / vapor で「取得タイミング」由来の差分を出す

**対処**: スナップショット前に必ず `expect(...).toHaveText()` 等で状態確定を
待つ ([e2e/scenarios/live-region.spec.mjs](../e2e/scenarios/live-region.spec.mjs) 参照)。
それでもブレる場合は `page.waitForLoadState()` を追加する。

## Vue 3.6 stable が出て結果の鮮度が心配

**対処**: `package.json` のバージョンを上げて
`pnpm run test:e2e && pnpm run diff` を再実行するだけ。
この追試の速さがこの構成の狙いそのもの。

## `pnpm run diff` が「スナップショットがありません」で終了する

**原因**: `e2e/snapshots/{classic,vapor}` がまだ生成されていない。

**対処**: 先に `pnpm run test:e2e` を実行する。

## `pnpm run smoke` が dist を見つけられない

**原因**: スモークテストはビルド成果物 (`apps/*/dist/assets/*.js`) を読み込む。

**対処**: 先に `pnpm run build:classic && pnpm run build:vapor` を実行する。
`--minify false` でビルドした直後の場合も、通常ビルドに戻してから実行する。
