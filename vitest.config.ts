// vitest.config.ts

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

// ⬇️ Polyfill before Vite resolves anything
import './tests/vitest-polyfill-crypto';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'], // your normal test setup
    testTimeout: 9000,
  },
});