import { createVaporSSRApp } from 'vue'
import App from './App.vue'

// サーバが描いた DOM を引き継ぐ (新規作成ではない)。
// classic は createSSRApp を使う。**この1行がこの検証の観測点そのもの**で、
// サーバ側の HTML は両 lane で同一 (prerender が毎回確認する) のだから、
// hydration 後にツリーが食い違えば原因はここしかない。
//
// createVaporSSRApp は @vue/runtime-vapor の独立実装で、classic の VDOM
// hydration とはコードを共有していない。
createVaporSSRApp(App).mount('#app')
