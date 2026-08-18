import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e/scenarios',
  webServer: [
    { command: 'pnpm run build:classic && pnpm exec vite preview --config apps/classic/vite.config.mjs --port 4173',
      port: 4173, reuseExistingServer: true },
    { command: 'pnpm run build:vapor && pnpm exec vite preview --config apps/vapor/vite.config.mjs --port 4174',
      port: 4174, reuseExistingServer: true },
  ],
  use: { headless: true },
})
