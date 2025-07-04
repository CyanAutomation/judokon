/* eslint-env node */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  use: {
    baseURL: "http://localhost:5000"
  },
  webServer: {
    command: "node scripts/playwrightServer.js",
    port: 5000,
    reuseExistingServer: true
  }
});
