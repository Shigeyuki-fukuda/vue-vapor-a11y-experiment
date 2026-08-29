<script setup lang="ts">
/**
 * 親から受け取った id で aria の関連付けを張る子。
 *
 * このコンポーネント自身はラベルも説明文も持たない。参照先の要素は親側に
 * あり、**コンポーネント境界をまたいで id 参照が保たれるか**がここでの
 * 観測対象。Vapor はテンプレートを template() に焼き込み、動的な属性は
 * setAttr で後から当てるため、props で渡した値が属性として出るまでの
 * 経路が classic (VNode props) と根本的に別になる。
 *
 * 型ベースの defineProps<T>() を使うのはこのコンポーネントが初。
 * README「TypeScript 化の影響」で、型ベースマクロが未使用のため
 * props / slots の合成は未検証、と留保していた箇所にあたる。
 */
defineProps<{
  labelId: string
  descriptionId: string
}>()
</script>

<template>
  <div class="field">
    <input type="text" :aria-labelledby="labelId" :aria-describedby="descriptionId" />
    <!--
      スロットの中身は親が書くが、描画位置はこの子が決める。
      「親の要素が子の指定した位置へ入る」経路も同時に観測できる。
      説明文をここへ流し込むため、上の aria-describedby の参照先は
      スロット経由で描画された要素になる。
    -->
    <slot />
  </div>
</template>
