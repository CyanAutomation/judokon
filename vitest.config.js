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
    globals: true, // Enables global functions like describe and it
    environment: "jsdom", // Use jsdom for DOM-related tests
    exclude: ["playwright/**", "scripts/**", "node_modules/**", "**/.git/**"],
    setupFiles: ["./tests/setup.js"],
    reporters: ["dot"],
    onConsoleLog(log, type) {
      // Reduce noise from jsdom navigation and optional navbar init in tests
      if (
        (type === "warn" || type === "error") &&
        (log.includes("Error applying navigation items:") ||
          log.includes("Not implemented: navigation"))
      ) {
        return false;
      }
      return undefined; // keep default behavior
    }
  }
});
