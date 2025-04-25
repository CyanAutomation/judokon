// vitest.config.js
import {defineConfig} from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom", // ✅ simulates a browser
    setupFiles: ["tests/setup.js"],
    testTimeout: 9000,
  },
})
