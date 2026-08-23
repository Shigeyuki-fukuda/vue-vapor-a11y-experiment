<script setup lang="ts">
import LiveRegionToast from './components/LiveRegionToast.vue'
import FocusDialog from './components/FocusDialog.vue'
import DisclosurePanel from './components/DisclosurePanel.vue'
import ValidatedForm from './components/ValidatedForm.vue'
import ConditionalBlocks from './components/ConditionalBlocks.vue'
import ReorderableList from './components/ReorderableList.vue'
</script>

<template>
  <main>
    <h1>Vue Vapor A11y Experiment (CI ゲート検証用)</h1>
    <LiveRegionToast />
    <FocusDialog />
    <DisclosurePanel />
    <ValidatedForm />
    <ConditionalBlocks />
    <ReorderableList />
  </main>
</template>
