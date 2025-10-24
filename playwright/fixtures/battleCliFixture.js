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

/**
 * Extended test fixture that clears battle CLI globals before each test.
 *
 * @pseudocode
 * 1. Before each test, inject a script that deletes known globals.
 * 2. Execute the test with a clean page context.
 * 3. After test, perform optional cleanup.
 *
 * @type {import("@playwright/test").TestType}
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    // Clear globalThis globals that persist across page navigations
    // This prevents state from test N from contaminating test N+1
    await page.addInitScript(() => {
      // WeakSet that tracks stat list elements with bound click handlers
      delete globalThis.__battleCLIStatListBoundTargets;

      // Window object that accumulates battle CLI initialization functions
      delete globalThis.__battleCLIinit;

      // Optional: Any other battle CLI module state stored globally
      delete globalThis.__battleCLIModuleState;
    });

    // Provide the cleaned page to the test
    await use(page);

    // Optional: Post-test cleanup if needed in future
    // (Currently not required as page is discarded after test)
  }
});

// Re-export expect for convenience
export { expect } from "@playwright/test";
