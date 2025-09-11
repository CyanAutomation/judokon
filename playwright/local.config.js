/* eslint-env node */
import { defineConfig } from "@playwright/test";

// Local config for running file://-based specs without starting the dev server.
export default defineConfig({
  // Resolve tests relative to this config's directory (./playwright)
  testDir: ".",
  reporter: "list",
  use: {
    // No baseURL needed; specs use file:// URLs directly.
    viewport: { width: 1920, height: 1080 },
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "retain-on-failure"
  }
});
