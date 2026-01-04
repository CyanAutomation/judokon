/* eslint-env node */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright/integration",
  reporter: "dot",
  use: {
    baseURL: "http://localhost:5000"
  }
});
