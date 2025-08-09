/**
 * Playwright test setup that automatically registers common routes.
 *
 * @pseudocode
 * 1. Import base test and expect from Playwright.
 * 2. Import registerCommonRoutes helper.
 * 3. Extend the base test's page fixture to:
 *    a. Clear localStorage and enable test-mode settings.
 *    b. Remove unexpected modal backdrops once after DOMContentLoaded.
 *    c. Register common routes.
 * 4. Export the extended test and expect.
 */
import { test as base, expect } from "@playwright/test";
import { registerCommonRoutes } from "./commonRoutes.js";

export const test = base.extend({
  /** @type {import('@playwright/test').Page} */
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem(
        "settings",
        JSON.stringify({ featureFlags: { enableTestMode: { enabled: true } } })
      );
    });
    await page.addInitScript(() => {
      document.addEventListener(
        "DOMContentLoaded",
        () => document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove()),
        { once: true }
      );
    });
    await registerCommonRoutes(page);
    await use(page);
  }
});

export { expect };
