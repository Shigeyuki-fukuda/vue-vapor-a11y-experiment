import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  root: 'apps/vapor',
  plugins: [vue()],
  server: { port: 5174 },
  build: { outDir: 'dist' },
})
