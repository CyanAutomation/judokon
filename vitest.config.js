// vitest.config.js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true, // Enables global functions like describe and it
    environment: "jsdom", // Use jsdom for DOM-related tests
    exclude: ["playwright/**", "node_modules/**", "**/.git/**"],
    setupFiles: ["./tests/setup.js"]
  }
});
