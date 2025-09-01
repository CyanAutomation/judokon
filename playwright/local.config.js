/* eslint-env node */
import { defineConfig } from "@playwright/test";

// Local config for running file://-based specs without starting the dev server.
export default defineConfig({
  testDir: "./playwright",
  reporter: "list",
  use: {
    // No baseURL needed; specs use file:// URLs directly.
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure"
  }
});
