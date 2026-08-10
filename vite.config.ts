/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
