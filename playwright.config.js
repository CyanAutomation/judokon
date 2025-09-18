/* eslint-env node */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  // Explicitly ignore Vitest unit tests that still use the Playwright-style `.spec` suffix.
  // This prevents `npx playwright test` from attempting to run helpers under `tests/`.
  testIgnore: ["../tests/scripts/**"],
  reporter: "dot",
  use: {
    baseURL: "http://localhost:5000",
    viewport: { width: 1920, height: 1080 },
    // Capture rich artifacts to aid debugging flaky UI timing in CI/local
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/playwrightServer.js",
    port: 5000,
    reuseExistingServer: false
  }
});
