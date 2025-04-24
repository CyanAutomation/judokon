import {defineConfig} from "vitest/config"

/// <reference types="vitest" />
export default {
  test: {
    globals: true,
    environment: "jsdom",
    testTimeout: 9000,
  },
}
