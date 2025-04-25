import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['__tests__/**/*.test.ts'],
    environment: 'node'
  },
  resolve: {
    alias: {
      '#native': '../cel-typescript.darwin-arm64.node'
    }
  },
  assetsInclude: ['**/*.node']
})
