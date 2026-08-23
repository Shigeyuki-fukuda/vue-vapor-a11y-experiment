# トラブルシューティング

実際に踏んだものを含む。

## `npm install` が ERESOLVE で失敗する

**原因**: `vue@3.6.0-rc.3` は semver 上プレリリース。npm はプレリリースを
`@vitejs/plugin-vue` の peer dependency `vue@^3.2.25` の範囲外と判定する。

**対処**: pnpm を使う。この構成では pnpm なら警告すら出ずに解決できる。
どうしても npm を使う場合は `--legacy-peer-deps` が必要。

## vapor 側の挙動が classic と全く同じで、差分がゼロすぎる

**原因**: Vapor モードが効いておらず、classic 同士を比較している可能性。

**対処**: `pnpm run verify` を実行する。両 lane の判定が ✅ OK なら、
差分ゼロは本物の結果である。

```sh
pnpm run verify
```

このスクリプトは通常ビルドの成果物をそのまま判定するので、
`--minify false` でビルドし直す必要はない。生成コードそのものを
読みたい場合の手順は [../README.md](../README.md) の
「コード生成方式が本当に切り替わっているか」を参照。

## `pnpm run verify` が失敗する

出力されたメッセージごとに原因が違う。

| メッセージ | 原因と対処 |
|---|---|
| `... の内容が一致しません` | `apps/*/src` を直接編集した。`source/components/` を編集して `pnpm run sync` をやり直す |
| `scripts/lanes.mjs の {lane}.vapor が ... であるべきです` | ビルド設定を取り違えている。`scripts/lanes.mjs` を戻す |
| `main.js が {関数} を使っていません` | entry のマウント関数が lane と食い違っている。`apps/{lane}/src/main.js` を直す |
| `HTML 文字列テンプレート (Vapor) が 0 件` | vapor lane が Vapor でビルドされていない。設定を直して `pnpm run build` をやり直す |
| `VNode props オブジェクト (VDOM) が N 件検出されました` | 想定と逆のコンパイル戦略になっている。同上 |
| `... がありません。先に pnpm run build:{lane} を...` | ビルド前に実行した。`pnpm run build` を先に実行する |

マーカーが 0 件になるのは、コンパイル戦略が違う場合と、Vue 側の実装変更で
マーカー自体が通用しなくなった場合の両方がありうる。前者でないと確認できたら
`scripts/verify-vapor-mode.mjs` の `MARKERS` を実測し直す。

## Vapor 化したコンポーネントがエラーになる

**原因**: Options API / Suspense は Vapor の対象外。

**対処**: 検証コンポーネントは `<script setup lang="ts">` + Composition API のみで書く。

## `pnpm run typecheck` が `ERR_PACKAGE_PATH_NOT_EXPORTED` で落ちる

```
Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './lib/tsc' is not
defined by "exports" in .../typescript/package.json
```

**原因**: `vue-tsc@3.3.11` は `typescript/lib/tsc` を require するが、
TypeScript 7 系はこのサブパスを `exports` から外している (実測: `typescript@7.0.2`)。

**対処**: TypeScript 5 系を使う。`pnpm add -D typescript@^5.9.0`。
`pnpm add -D typescript` はバージョン指定なしだと 7 系が入る。

## `pnpm run typecheck` が通るが、本当に検査されているか怪しい

**原因**: `tsconfig.json` の `include` が 1 ファイルも拾っていなくても
vue-tsc は成功で終了する。

**対処**: 対象ファイルを列挙して確認する。両 lane 分 (App.vue + components) が
出れば正しい。

```sh
pnpm exec vue-tsc -p tsconfig.json --listFiles | grep apps/
```

型チェックは配布後の `apps/*/src` を対象にしている。`source/` を直接
対象にしないのは、`source/components/App.vue` の `./components/*.vue` が
配布先のレイアウトを前提にしたパスで、`source/` 配下では解決できないため。
したがって **`pnpm run sync` を通していないと古いコードを検査する**。

## ariaSnapshot が classic / vapor で「取得タイミング」由来の差分を出す

**対処**: スナップショット前に必ず `expect(...).toHaveText()` 等で状態確定を
待つ ([e2e/scenarios/live-region.spec.mjs](../e2e/scenarios/live-region.spec.mjs) 参照)。
それでもブレる場合は `page.waitForLoadState()` を追加する。

## フォーカスを移動させたのに ariaSnapshot に差が出ない

**原因**: `ariaSnapshot()` の出力にフォーカス位置は含まれない。
ツリーの構造だけを見ているので、どこにフォーカスがあっても同じ結果になる。

**対処**: `:focus` 要素のアクセシビリティ表現を別時点として保存し、
これも比較対象に含める
([e2e/scenarios/focus-management.spec.mjs](../e2e/scenarios/focus-management.spec.mjs) 参照)。

```js
const focusOpened = await page.locator(':focus').ariaSnapshot()
```

初期状態のようにフォーカスが `body` にある時点では `:focus` がどの要素にも
マッチせず取得に失敗するため、その時点は記録しない。

## `pnpm run smoke` が意図しないボタンを押している

**原因**: スモークテストは「live region の配線が繋がっているか」だけを見る
最小チェックで、ボタンをテキストで特定している。テキストを変えると空振りする。

**対処**: `source/components/LiveRegionToast.vue` のボタン名を変えたときは
[scripts/smoke-test.mjs](../scripts/smoke-test.mjs) の対象テキストも合わせる。
なお、より広い検証は E2E 側の責務なのでスモークは増やさない。

## Vue 3.6 stable が出て結果の鮮度が心配

**対処**: `package.json` のバージョンを上げて `pnpm run check` を再実行するだけ。
この追試の速さがこの構成の狙いそのもの。バージョンを上げた直後は
Vapor 側の実装が変わっている可能性があるため、`check` に含まれる
`verify` の結果を必ず確認する。

## `pnpm run test:e2e` が「is already used」で失敗する

```
Error: http://localhost:4173 is already used, make sure that nothing is running
on the port/url or set reuseExistingServer:true in config.webServer.
```

**原因**: `pnpm run preview:{lane}` を立てたまま E2E を回した。

**対処**: preview を止めてから実行する。**これは意図的に失敗させている。**
`reuseExistingServer: true` にすると Playwright は既存サーバを再利用するが、
そのサーバが古い成果物を配信していても気付けず「差分 0 件」を出してしまう。
VoiceOver 検証で preview を立てたまま E2E を回すのは実際に起きるため、
黙って通すより落とすほうを選んでいる。

## `pnpm run preview:{lane}` が「Port is already in use」で失敗する

```
error when starting preview server:
Error: Port 4173 is already in use
```

**原因**: そのポートに何かが立っている。

**対処**: 既存のプロセスを止める。`vite.config` に `strictPort: true` を
付けているため、Vite は空いている別ポートへ逃げずに失敗する。
これも意図的で、逃げてしまうと 4174 が埋まっていて vapor が 4175 で起動し、
4173 に残った classic を相手に「classic 同士」を比較する事故が起きる。
VoiceOver は何も言わずに読み上げるので、この事故は自力では気付けない。

なお `vite preview` は `[::1]` (IPv6) にバインドする。ポートを掴んでいる
プロセスを探すときは IPv6 側も見る。

```sh
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

## `pnpm run diff` が「スナップショットがありません」で終了する

**原因**: `e2e/snapshots/{classic,vapor}` がまだ生成されていない。

**対処**: 先に `pnpm run test:e2e` を実行する。

## `pnpm run smoke` が dist を見つけられない

**原因**: スモークテストはビルド成果物 (`apps/*/dist/assets/*.js`) を読み込む。

**対処**: 先に `pnpm run build` を実行する。
`--minify false` でビルドした直後の場合も、通常ビルドに戻してから実行する。
