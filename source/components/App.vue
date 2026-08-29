<script setup lang="ts">
import LiveRegionToast from './components/LiveRegionToast.vue'
import FocusDialog from './components/FocusDialog.vue'
import DisclosurePanel from './components/DisclosurePanel.vue'
import ValidatedForm from './components/ValidatedForm.vue'
import ConditionalBlocks from './components/ConditionalBlocks.vue'
import ReorderableList from './components/ReorderableList.vue'
import ComposedField from './components/ComposedField.vue'
import TeleportDialog from './components/TeleportDialog.vue'
import TransitionAlert from './components/TransitionAlert.vue'
import DynamicPanel from './components/DynamicPanel.vue'
</script>

<template>
  <main>
    <h1>Vue Vapor A11y Experiment</h1>
    <LiveRegionToast />
    <FocusDialog />
    <DisclosurePanel />
    <ValidatedForm />
    <ConditionalBlocks />
    <ReorderableList />
    <ComposedField />
    <TeleportDialog />
    <TransitionAlert />
    <DynamicPanel />
  </main>
</template>

<!--
  このアプリのスタイルはここに集約する。

  `scoped` は付けない。scoped にすると全要素へ data-v-* が付与され、
  スコープ id の当て方が lane 間でずれた場合、それが検証対象と無関係な
  差分として出てしまう (理由は TransitionAlert.vue のコメントと同じ)。

  アクセシビリティツリーを変えない範囲に限る。具体的には、
  - `display: none` / `visibility: hidden` を新たに当てない
    (v-show が使うインラインの display は上書きしない)
  - `content` で文字を生成しない (アクセシブルネームに混ざる)
  この2つを守っている限り、見た目を変えても ariaSnapshot は動かない。

  `.lane-banner` の要素は apps/{lane}/index.html と ssr.html にあり、
  ここには無い。スタイルだけをこちらに置いているのは、4つある HTML の
  シェルへ CSS を書き写すと lane 間で食い違う余地ができるため。
-->
<style>
:root {
  color-scheme: light;

  --paper: #f7f5f0;
  --surface: #ffffff;
  --ink: #14161a;
  --muted: #5a616e;
  --rule: #d8d3c7;
  --focus: #0b57d0;
  --danger: #a3231b;
  --lane-classic: #2f5fd0;
  --lane-vapor: #a75a00;

  --space: clamp(1rem, 0.6rem + 1.2vw, 1.75rem);
  --radius: 10px;
  --banner-height: 2.5rem;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  /* 上端は固定表示の lane 帯が占める。その分を空けておく */
  padding: calc(var(--banner-height) + var(--space)) var(--space) calc(var(--space) * 3);
  background: var(--paper);
  color: var(--ink);
  font-family: system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
  font-size: clamp(1rem, 0.95rem + 0.3vw, 1.125rem);
  line-height: 1.7;
}

/*
  どちらの lane を見ているかの表示。

  色だけで区別すると録画の圧縮や色覚特性で失われるため、vapor 側は
  斜線のテクスチャでも区別できるようにしてある。
*/
.lane-banner {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 100;
  height: var(--banner-height);
  display: flex;
  align-items: center;
  padding-inline: var(--space);
  font: 700 0.95rem/1 var(--mono);
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #fff;
  background: var(--lane-classic);
}

.lane-banner[data-lane='vapor'] {
  background: repeating-linear-gradient(135deg, var(--lane-vapor) 0 14px, #8f4d00 14px 28px);
}

main {
  max-width: 60rem;
  margin: 0 auto;
  display: grid;
  gap: var(--space);
}

h1 {
  margin: 0;
  font-size: clamp(1.5rem, 1.1rem + 1.6vw, 2.25rem);
  letter-spacing: -0.01em;
}

main > section {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
  padding: var(--space);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
}

main > section > h2 {
  width: 100%;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--rule);
  font-size: 1.05rem;
  font-weight: 700;
}

main > section > p {
  margin: 0;
  color: var(--muted);
}

button {
  padding: 0.45em 1.1em;
  font: inherit;
  font-weight: 600;
  color: var(--ink);
  background: var(--surface);
  border: 1.5px solid var(--ink);
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background: #ecebe5;
}

/*
  よくある質問の行。質問文の左、開閉の印を右端に置いて、
  行そのものが押せることが見て分かる形にする。
*/
.disclosure-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.8em 1em;
  text-align: left;
  border-color: var(--rule);
  border-radius: var(--radius);
}

/*
  開閉の印。閉じているときは下向き、開いたら上向きに返す。
  文字ではなく境界線で三角を描いているのは、::before の content が
  アクセシブルネームへ混ざるのを避けるため。
*/
.disclosure-marker {
  flex: none;
  width: 0;
  height: 0;
  border-right: 0.35rem solid transparent;
  border-left: 0.35rem solid transparent;
  border-top: 0.45rem solid var(--muted);
  transition: transform 180ms ease;
}

.disclosure-toggle[aria-expanded='true'] .disclosure-marker {
  transform: rotate(180deg);
}

.disclosure-panel {
  padding: 0 1em;
}

.disclosure-panel > p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

@media (prefers-reduced-motion: reduce) {
  .disclosure-marker {
    transition: none;
  }
}

input {
  min-width: min(24rem, 100%);
  padding: 0.45em 0.6em;
  font: inherit;
  color: inherit;
  background: var(--surface);
  border: 1.5px solid var(--rule);
  border-radius: 6px;
}

/*
  上の input の既定はテキスト入力向け。min-width と枠線がチェックボックスにも
  当たると、四角が入力欄の幅まで伸びて別物に見える。この形だけ打ち消す。
*/
input[type='checkbox'] {
  width: 1.1rem;
  height: 1.1rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  accent-color: var(--focus);
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ラベルの文字を押しても切り替わることが分かるようにする */
.checkbox-field label {
  cursor: pointer;
}

input[aria-invalid='true'] {
  border-color: var(--danger);
}

/*
  エラー中の入力欄にフォーカスが当たると、赤い枠線と青いフォーカスリングが
  同心に2本並ぶ。輪が2つ見えるだけで、どちらがどの状態を表しているのかは
  読み取れない。

  **この重なりは送信に失敗するたび必ず起きる。** ValidatedForm が不正な
  入力欄へフォーカスを戻すので、「エラー」と「フォーカス」は同時に成立する。

  リングを枠線と同じ赤にし、隙間 (outline-offset) を詰めて1本の太い枠に見せる。
  下の :focus-visible より詳細度が高いのでこちらが勝つ。

  色を揃えてもフォーカスの有無は判別できる。輪の太さが 1.5px から 4.5px へ
  変わり、増えた3px分は直前まで地色だった場所なので、フォーカス前後の
  コントラスト比は 3:1 を超える (WCAG 2.4.11 の求める差)。
*/
input[aria-invalid='true']:focus-visible {
  outline-color: var(--danger);
  outline-offset: 0;
}

/*
  form は section の grid の外側なので、中の要素は間隔を持たない。
  ラベル・入力欄・エラー文・ボタンが詰まって見えるのを防ぐ。
*/
form {
  display: grid;
  justify-items: start;
  gap: 0.5rem;
  width: 100%;
}

form button[type='submit'] {
  margin-top: 0.5rem;
}

/* 親が持つラベルと、子のスロットへ流し込まれる注記 */
.field {
  width: 100%;
}

.field-label {
  font-weight: 600;
}

.field-hint {
  margin: 0.4rem 0 0;
  font-size: 0.9em;
  color: var(--muted);
}

/* フォーカスリングはこの実験の観察対象そのものなので、既定より太く取る */
:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}

/* ダイアログ本文。見出しと閉じるボタンの間に置く文言 */
[role='dialog'] p {
  margin: 0;
  color: var(--muted);
  line-height: 1.7;
}

[role='alert'] {
  margin: 0;
  color: var(--danger);
  font-weight: 600;
}

/*
  トーストの器。一般的な通知に合わせて画面上部の中央へ固定する。
  **DOM 上の位置はセクションの中のままなので ariaSnapshot は変わらない。**
  pointer-events を切ってあるのは、通知が背後の操作を邪魔しないため。
*/
.toast-region {
  position: fixed;
  top: calc(var(--banner-height) + 0.75rem);
  /*
    器そのものを画面の中央へ寄せる。器は中身の幅しか持たないので、
    left: 50% と -50% の平行移動で画面幅に依らず中央に来る。
    入場アニメーションは .toast 側に当たっているため、この transform とは衝突しない。
  */
  left: 50%;
  transform: translateX(-50%);
  z-index: 70;
  display: grid;
  justify-items: center;
  gap: 0.5rem;
  max-width: calc(100vw - 2 * var(--space));
  pointer-events: none;
}

.toast {
  margin: 0;
  padding: 0.7em 1.4em;
  color: #f3f7f4;
  font-weight: 600;
  background: #1b2430;
  border-radius: 10px;
  box-shadow: 0 12px 30px rgb(20 22 26 / 0.28);
  animation: toast-in 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }
}

/*
  list-style: none を当てても listbox の意味は失われない。role を明示して
  いるため。同じ理由で .plan-list / .plan-cards には role="list" を付けてある。
  Safari は list-style を消した ul をリストとして読まなくなることがある。
*/
ul[role='listbox'] {
  display: grid;
  gap: 0.25rem;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

li[role='option'] {
  padding: 0.4em 0.75em;
  border: 1px solid var(--rule);
  border-radius: 6px;
  cursor: pointer;
}

li[role='option'][aria-selected='true'] {
  font-weight: 700;
  background: #eaeff9;
  border-color: var(--ink);
}

[role='region'] {
  width: 100%;
  padding-left: 0.9rem;
  border-left: 3px solid var(--rule);
}

/* :is で差し替わる2つのビュー。枠を共通にしてあるので、切り替えで
   変わるのは中身だけに見える */
.view-note {
  margin: 0 0 0.75rem;
  font-size: 0.9em;
  color: var(--muted);
}

.plan-list,
.plan-cards {
  margin: 0;
  padding: 0;
  list-style: none;
}

.plan-list {
  display: grid;
  gap: 0.25rem;
}

.plan-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55em 0.7em;
  border-bottom: 1px solid var(--rule);
}

.plan-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0.75rem;
}

.plan-cards li {
  display: grid;
  gap: 0.3rem;
  padding: 0.9em;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 8px;
}

.plan-name {
  font-weight: 600;
}

/* 年払いだけに出る割引の表示。金額より小さく、色で区別する */
.plan-saving {
  font-size: 0.8em;
  font-weight: 600;
  color: var(--lane-vapor);
}

.plan-price {
  font-size: 0.85em;
  color: var(--muted);
}

/* 背後のクリックを遮る幕。aria-hidden なのでツリーには出ない */
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgb(20 22 26 / 0.55);
}

[role='dialog'] {
  position: fixed;
  z-index: 60;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: grid;
  justify-items: start;
  gap: 0.9rem;
  width: min(28rem, calc(100vw - 2 * var(--space)));
  padding: calc(var(--space) * 1.1);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  box-shadow: 0 24px 60px rgb(20 22 26 / 0.28);
}

[role='dialog'] h3 {
  margin: 0;
  font-size: 1.15rem;
}

/*
  ダイアログ自身は tabindex="-1" でプログラム的にフォーカスされる。
  :focus-visible が当たらないブラウザがあるため :focus でも描く。
*/
[role='dialog']:focus {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
}
</style>
