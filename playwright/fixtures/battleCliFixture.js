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

import { test as base } from "./commonSetup.js";
import {
  ensureBattleCliResetChannel,
  waitForTestApi
} from "../helpers/battleStateHelper.js";

/**
 * Extended test fixture that ensures battle CLI tests run with isolated state.
 *
 * @pseudocode
 * 1. Reuse the common setup `page` (ensures CDN mocks + hooks run).
 * 2. Inject script to clear known globals BEFORE page navigation.
 * 3. After page navigation, call __resetModuleState() to clear module vars.
 * 4. Execute the test with clean environment.
 * 5. Cleanup resources after test by unbinding listeners.
 *
 * Strategy: Clear globals early + reset module state after init
 * This provides defense-in-depth against state pollution between tests.
 *
 * @type {import("@playwright/test").TestType}
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const battleCliResetChannel = await ensureBattleCliResetChannel(page);

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
    const handleFrameNavigation = async (frame) => {
      if (frame !== page.mainFrame()) {
        return;
      }

      const navigatedUrl = frame.url();
      if (!navigatedUrl || navigatedUrl === "about:blank") {
        return;
      }

      try {
        await waitForTestApi(page);
      } catch (error) {
        await battleCliResetChannel.signalReset({ ok: false, error: String(error) });
        return;
      }

      try {
        const result = await page.evaluate(async () => {
          const initApi = window.__TEST_API?.init;
          if (typeof initApi?.resetBattleCliModuleState === "function") {
            return await initApi.resetBattleCliModuleState();
          }
          return { ok: false, reason: "resetBattleCliModuleState not available" };
        });
        await battleCliResetChannel.signalReset(result);
      } catch (error) {
        await battleCliResetChannel.signalReset({ ok: false, error: String(error) });
      }
    };

    // POST-NAVIGATION: After page loads, reset module state by calling the init function
    page.on("framenavigated", handleFrameNavigation);

    try {
      // Provide the page to the test
      await use(page);
    } finally {
      page.off("framenavigated", handleFrameNavigation);
    }
  }
});

// Re-export expect for convenience
export { expect } from "./commonSetup.js";
