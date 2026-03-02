import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'miniflare',
    setupFiles: ['./test/setup.ts']
  }
})
