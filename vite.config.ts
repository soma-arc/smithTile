/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  test: {
    // Pure geometry/render-core tests run in node; component tests opt into
    // jsdom via a per-file `// @vitest-environment jsdom` pragma.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}']
  }
})
