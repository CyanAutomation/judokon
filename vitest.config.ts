/// <reference types="vitest" />
import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [
      "./tests/vitest-polyfill-crypto.ts", // 👈 comes first!
      "./tests/setup.ts",
    ],
    testTimeout: 9000,
  },
})
