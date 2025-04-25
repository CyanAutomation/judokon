// vitest.config.ts

// 👇 Patch crypto manually BEFORE anything Vite or Vitest loads
import { webcrypto } from 'node:crypto';
(globalThis as any).crypto ??= webcrypto;

/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    testTimeout: 9000,
  },
});