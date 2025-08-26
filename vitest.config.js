// vitest.config.js
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(rootDir, "src")
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    // Exclude Playwright specs and diagnostic Playwright files from Vitest.
    // Vitest should only run unit/integration tests under `tests/`.
    exclude: [
      "node_modules/**",
      "dist/**",
      ".idea/**",
      ".git/**",
      ".cache/**",
      "tests/e2e/**",
      "tests/playwright/**",
      "playwright/**",
      "scripts/**/*.spec.*"
    ],
    // Use default reporter w/o summary (replaces deprecated 'basic')
    reporters: [["default", { summary: false }]],
    coverage: {
      reporter: ["text", "json", "html"]
    }
  }
});
