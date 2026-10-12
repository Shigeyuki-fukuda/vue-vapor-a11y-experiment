# VoiceOver 読み上げ記録 (classic vs vapor)

**全 11 カテゴリの実測は完了している。** 発話の全文・所見・スクリーンショットは
[Issue #21](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21)
のコメントにカテゴリごとに置いてある。ここには環境と判定の一覧だけを残す
(同じ記録を 2 箇所に置くと、必ず片方が古くなる)。

手順は [../docs/voiceover-procedure.md](../docs/voiceover-procedure.md) を参照。

## 検証環境

| 項目 | 値 |
|---|---|
| 検証日 | 2026-09-09 〜 2026-09-17 |
| macOS | 26.6.2 |
| Safari | 26.6.2 |
| VoiceOver 詳細度 | 高 (日本語) |
| vue | 3.6.0-rc.3 |

> 読み上げ挙動は上記の環境に依存する。環境を変えて検証した場合は
> 行を追加せず、新しい見出しで別セクションを作ること。

## 判定

各行のリンク先に、操作・期待値・classic / vapor の発話全文・所見がある。

| # | カテゴリ | 判定 |
|---|---|---|
| B1 | [Live Region: トースト通知](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559697809) | ✅ |
| B2 | [フォーカス管理: モーダルダイアログ](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559698026) | ❌ |
| B3 | [動的 aria 属性: 開閉パネル](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559698230) | ✅ |
| B4 | [フォームエラー: 入力欄との紐付け](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559698411) | ✅ |
| B5 | [条件付き描画: v-if と v-show](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559698577) | ✅ |
| B6 | [リスト描画: キー付き v-for](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559698795) | ✅ |
| B7 | [props / slots によるコンポーネント合成](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559698978) | ✅ |
| B8 | [Teleport: body 直下へ移すダイアログ](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559699215) | ✅ |
| B9 | [Transition: leave 中のツリー](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559699597) | ✅ |
| B10 | [動的コンポーネント: :is による差し替え](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559699798) | ✅ |
| B11 | [SSR / hydration](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559699965) | ✅ |

判定は Classic 欄と Vapor 欄が一字一句一致したかで付けている。`✅` は一致、
`❌` は一文字でも違うもの。両 lane は一致しているが期待とは違う箇所は
`📝` として各コメントの所見に回してあり、lane 差ではないので判定には数えない。

## lane 差は B2 の 1 件だけ

[モーダルダイアログの境界で、Vapor lane だけ VoiceOver が領域名を読まなかった](https://github.com/Shigeyuki-fukuda/vue-vapor-a11y-experiment/issues/21#issuecomment-5559698026)。
再測でも再現した。ariaSnapshot は両 lane で同一で、原因は特定していない。同じダイアログを `<Teleport>` で `body` 直下へ移した B8 では
この差が出ないため、位置ではなく**モーダル境界の扱い**の差として観測している。

残る 10 カテゴリは、記録したすべての停止で両 lane が一字一句一致した。

## 測っていないもの

**この結果は上記 1 構成でのもので、「Vapor Mode でアクセシビリティは壊れない」の
一般的な根拠にはならない。**

- NVDA / JAWS / TalkBack など macOS 以外の支援技術
- VoiceOver の詳細度「高」以外の設定、日本語以外の言語
- Safari 以外のブラウザ (VoiceOver は Chrome / Firefox でも動くが挙動が異なる)
- `vue` 3.6.0-rc.3 以外のバージョン。Vapor は変更が続いているため、rc が上がれば
  結果が変わりうる

## 採取方法

B1〜B10 は人が `⌃⌥⇧C` (直前の読み上げをクリップボードへ) を押して貼り付けた。
B11 は停止数が多く取りこぼしが混じるため、[`scripts/vo-capture.py`](../scripts/vo-capture.py)
で同じ文字列 (`content of last phrase`) を AppleScript から採取している。
妥当性は、手測の記録がある B5 を再現して 8 停止すべて一致することで確認した。
