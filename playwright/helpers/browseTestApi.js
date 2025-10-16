/**
 * Call a method on the browse test API exposed via `window.__TEST_API.browse`.
 *
 * @pseudocode
 * 1. Wait for the requested method to exist on `window.__TEST_API.browse`.
 * 2. Invoke the method inside the browser context with the provided arguments.
 * 3. Return the resolved value to the Playwright test.
 *
 * @param {import('@playwright/test').Page} page - Active Playwright page instance.
 * @param {keyof import('../../src/helpers/browse/testApi.js').browseTestApi} method - API method name.
 * @param {...any} args - Arguments forwarded to the browser context.
 * @returns {Promise<any>} Result returned by the browser-side API method.
 */
export async function callBrowseTestApi(page, method, ...args) {
  await page.waitForFunction(
    (name) => typeof window.__TEST_API?.browse?.[name] === "function",
    method,
    { timeout: 10_000 }
  );

  return page.evaluate(
    ({ name, params }) => window.__TEST_API.browse[name](...params),
    { name: method, params: args }
  );
}

/**
 * Wait for the browse carousel to finish rendering via the test API.
 *
 * @pseudocode
 * 1. Delegate to `callBrowseTestApi` with the `waitForReady` method.
 * 2. Forward timeout options provided by the caller.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ timeout?: number }} [options]
 * @returns {Promise<{ isReady: boolean, cardCount: number }>}
 */
export function waitForBrowseReady(page, options) {
  return callBrowseTestApi(page, "waitForReady", options);
}

/**
 * Disable hover animations through the sanctioned test API.
 *
 * @pseudocode
 * 1. Invoke the `disableAnimations` method via `callBrowseTestApi`.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
export function disableBrowseAnimations(page) {
  return callBrowseTestApi(page, "disableAnimations");
}

/**
 * Add a judoka card using the production pipeline via the test API.
 *
 * @pseudocode
 * 1. Delegate to `callBrowseTestApi` with the `addCard` method and judoka payload.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('../../src/helpers/types.js').Judoka} judoka
 * @returns {Promise<void>}
 */
export function addBrowseCard(page, judoka) {
  return callBrowseTestApi(page, "addCard", judoka);
}

/**
 * Reset browse-specific test mutations.
 *
 * @pseudocode
 * 1. Invoke the `reset` method on `window.__TEST_API.browse` via the helper.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
export function resetBrowseApi(page) {
  return callBrowseTestApi(page, "reset");
}
