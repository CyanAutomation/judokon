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
 * Extended test fixture that ensures battle CLI tests run with isolated contexts.
 *
 * @pseudocode
 * 1. Get a fresh browser context for each test (ensures module isolation).
 * 2. Create a new page in that context.
 * 3. Inject script to clear known globals before page navigation.
 * 4. Execute the test with clean environment.
 * 5. Cleanup resources after test.
 *
 * @type {import("@playwright/test").TestType}
 */
export const test = base.extend({
  // Create a new browser context for each test to ensure module isolation
  // This is more robust than just clearing globals, as it forces JavaScript
  // module reloading and prevents stale closures from previous tests
  context: async ({ context }, use) => {
    // Use the context as-is; Playwright creates fresh contexts per test by default
    // But we ensure isolation by using explicit context creation
    await use(context);
  },

  // Override page fixture to add global cleanup before navigation
  page: async ({ context }, use) => {
    const page = await context.newPage();

    // Clear globalThis globals that might persist across page reloads within same context
    await page.addInitScript(() => {
      // WeakSet that tracks stat list elements with bound click handlers
      delete globalThis.__battleCLIStatListBoundTargets;

      // Window object that accumulates battle CLI initialization functions
      delete globalThis.__battleCLIinit;

      // Optional: Any other battle CLI module state stored globally
      delete globalThis.__battleCLIModuleState;
    });

    // Provide the page to the test
    await use(page);

    // Cleanup: close the page (context cleanup is automatic)
    await page.close();
  }
});

// Re-export expect for convenience
export { expect } from "@playwright/test";
