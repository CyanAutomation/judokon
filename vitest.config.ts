// vitest.config.ts

import {webcrypto} from "node:crypto"
;(globalThis as any).crypto ??= webcrypto // ✅ Patch before anything loads

import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    testTimeout: 9000,
  },
})
