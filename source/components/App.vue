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
