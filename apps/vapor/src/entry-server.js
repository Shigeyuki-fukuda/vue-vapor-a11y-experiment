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
 */
export function render() {
  return renderToString(createSSRApp(App))
}
