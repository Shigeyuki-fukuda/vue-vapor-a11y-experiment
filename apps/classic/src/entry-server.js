import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import App from './App.vue'

/**
 * サーバ側で HTML 文字列を組み立てる。
 *
 * **両 lane でこのファイルは同一。** createVaporSSRApp ではなく createSSRApp を
 * 使うのは、Vapor 側に SSR 用のレンダラが存在しないため。compileTemplate は
 * ssr:true のとき vapor フラグを無視し、両 lane で同じ ssrRender を吐く
 * (詳細は README「SSR / hydration」)。
 *
 * 内容が同じなのに lane ごとに置いてあるのは、両方を実際にビルドして
 * 出力の一致を scripts/prerender.mjs に確かめさせるため。
 * 「同一のはず」を前提にせず毎回突き合わせる。
 *
 * ## teleports を返す理由
 *
 * `<Teleport to="body">` の中身は本体の HTML に含まれず `context.teleports`
 * に溜まる。本体だけを ssr.html へ差し込むと移動先 (body) にマーカーが無い
 * まま hydration が始まり、クライアントは body の先頭から順にノードを
 * Teleport の中身として取り込んでしまう。**実測では `#app` と `<script>` が
 * 丸ごと消えた。** ページは白紙になるが例外は出ず、コンソールには
 * 「Hydration completed but contains mismatches」しか残らない。
 */
export async function render() {
  const context = {}
  const html = await renderToString(createSSRApp(App), context)
  return { html, teleports: context.teleports ?? {} }
}
