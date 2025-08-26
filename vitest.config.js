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
    exclude: ["node_modules", "dist", ".idea", ".git", ".cache", "tests/e2e", "tests/playwright"],
    reporters: "basic",
    coverage: {
      reporter: ["text", "json", "html"]
    }
  }
});
