/**
 * Playwright test fixture for Battle CLI tests.
 *
 * Ensures proper test isolation by clearing global state that persists
 * across page navigations in Playwright's test environment.
 *
 * This fixture addresses the test isolation issue where module-level globals
 * and WeakSet tracking prevent clean initialization between CLI tests.
 *
 * @module battleCliFixture
 * @see progressIsolation.md - Detailed analysis of the isolation issue
 *
 * @example
 * import { test, expect } from "./fixtures/battleCliFixture.js";
 *
 * test("my CLI test", async ({ page }) => {
 *   // page is automatically cleaned of battle CLI globals
 *   await page.goto("/src/pages/battleCLI.html?autostart=1");
 *   // ...
 * });
 */

import { test as base } from "@playwright/test";
import { waitForTestApi } from "../helpers/battleStateHelper.js";

/**
 * Extended test fixture that ensures battle CLI tests run with isolated state.
 *
 * @pseudocode
 * 1. Create a new page in the browser context.
 * 2. Inject script to clear known globals BEFORE page navigation.
 * 3. After page navigation, call __resetModuleState() to clear module vars.
 * 4. Execute the test with clean environment.
 * 5. Cleanup resources after test.
 *
 * Strategy: Clear globals early + reset module state after init
 * This provides defense-in-depth against state pollution between tests.
 *
 * @type {import("@playwright/test").TestType}
 */
export const test = base.extend({
  page: async ({ context }, use) => {
    const page = await context.newPage();

    // PRE-NAVIGATION: Clear globals that might persist across page reloads
    await page.addInitScript(() => {
      // WeakSet that tracks stat list elements with bound click handlers
      delete globalThis.__battleCLIStatListBoundTargets;

      // Window object that accumulates battle CLI initialization functions
      delete globalThis.__battleCLIinit;

      // Optional: Any other battle CLI module state stored globally
      delete globalThis.__battleCLIModuleState;

      // Leave __TEST__ flag alone - may be intentionally set by page init
    });

    // POST-NAVIGATION: After page loads, reset module state by calling the init function
    page.on("framenavigated", async (frame) => {
      if (frame !== page.mainFrame()) {
        return;
      }

      const navigatedUrl = frame.url();
      if (!navigatedUrl || navigatedUrl === "about:blank") {
        return;
      }

      try {
        await waitForTestApi(page);
      } catch {
        return;
      }

      try {
        await page.evaluate(() => {
          const initApi = window.__TEST_API?.init;
          if (typeof initApi?.resetBattleCliModuleState === "function") {
            return initApi.resetBattleCliModuleState();
          }
          return null;
        });
      } catch {
        // Silently ignore errors during reset
      }
    });

    // Provide the page to the test
    await use(page);

    // Cleanup: close the page
    await page.close();
  }
});

// Re-export expect for convenience
export { expect } from "@playwright/test";
