# VoiceOver 検証手順 (macOS)

`ariaSnapshot` はアクセシビリティツリーの構造を機械的に比較できるが、
「スクリーンリーダーが実際にどう読み上げるか」までは保証しない。
そこを埋めるのがこの VoiceOver 検証。

**classic (localhost:4173) と vapor (localhost:4174) で完全に同じキー操作を行う**
ことが唯一かつ最重要のルール。操作が違えば読み上げの違いが Vapor 起因か
操作起因か切り分けられなくなる。

## 事前準備

### 1. プレビューサーバの起動

```sh
pnpm run build:classic && pnpm exec vite preview --config apps/classic/vite.config.mjs --port 4173
pnpm run build:vapor   && pnpm exec vite preview --config apps/vapor/vite.config.mjs   --port 4174
```

### 2. キャプションパネルの有効化

読み上げ内容を画面に字幕表示させると、録画にそのまま残るので後から検証できる。

1. VoiceOver を起動 (⌘ + F5)
2. VoiceOver ユーティリティを開く (VO + F8)
3. 「ビジュアル」→ 「キャプションパネル」を有効化

### 3. 録画の準備

- QuickTime の画面収録、またはショートカット ⇧⌘5
- **マイクを ON** にすると読み上げ音声も残る

## 実行手順 (項目ごとに classic → vapor の順で同一操作)

| # | 操作 | キー |
|---|---|---|
| 1 | ページを開く | Safari で対象 URL へ |
| 2 | フォーカスをボタンへ移動 | `Tab` |
| 3 | 読み上げを記録 | (自動読み上げ) |
| 4 | ボタンを押下 | `VO + Space` |
| 5 | live region の読み上げを記録 | (自動読み上げ) |

読み上げ全文は聞き取りではなくキャプションパネルの表示テキストを
そのまま書き写すこと (聞き取りだと表記ゆれが入る)。

## 記録先

[../results/voiceover-log.md](../results/voiceover-log.md)

## 環境の明記が必須

読み上げ挙動は下記に強く依存するため、発表資料と README に必ず書く。

- macOS のバージョン
- Safari のバージョン
- VoiceOver の詳細度設定 (「詳細度」→ 「テキストの読み上げ」など)

環境が違えば結果は再現しない。「差分なし」という結論の適用範囲を
明示するために書く。
