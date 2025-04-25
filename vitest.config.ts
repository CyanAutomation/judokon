// vitest.config.ts

// ✅ Patch crypto BEFORE anything else
import { webcrypto } from 'node:crypto';
(globalThis as any).crypto ??= webcrypto;

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'], // your usual test setup
    testTimeout: 9000,
  },
});