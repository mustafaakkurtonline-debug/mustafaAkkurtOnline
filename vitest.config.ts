import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  define: {
    __APP_RELEASE__: JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
