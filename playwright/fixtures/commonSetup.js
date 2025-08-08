/**
 * Playwright test setup that automatically registers common routes.
 *
 * @pseudocode
 * 1. Import base test and expect from Playwright.
 * 2. Import registerCommonRoutes helper.
 * 3. Extend the base test's page fixture to register routes and clear
 *    localStorage before each test.
 * 4. Export the extended test and expect.
 */
import { test as base, expect } from "@playwright/test";
import { registerCommonRoutes } from "./commonRoutes.js";

export const test = base.extend({
  /** @type {import('@playwright/test').Page} */
  page: async ({ page }, use) => {
    await registerCommonRoutes(page);
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem(
        "settings",
        JSON.stringify({ featureFlags: { enableTestMode: { enabled: true } } })
      );
    });
    await use(page);
  }
});

export { expect };
