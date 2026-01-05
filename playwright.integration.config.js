/* eslint-env node */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright/integration",
  reporter: "dot",
  use: {
    baseURL: "",
    viewport: { width: 1920, height: 1080 },
    // Capture rich artifacts to aid debugging flaky UI timing in CI/local
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/playwrightServer.js",
    port: 5000,
    reuseExistingServer: true
  }
});
