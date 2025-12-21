import { expect } from "@playwright/test";

const DEFAULT_TIMEOUT = 5000;

/**
 * Wait for the browse test API to become available.
 *
 * @pseudocode
 * 1. Poll for `window.__TEST_API.browse` using `page.waitForFunction`
 * 2. Resolve with true when the API is available within the timeout window
 * 3. Catch timeout errors and resolve with false to signal unavailability
 *
 * @param {import("@playwright/test").Page} page - The Playwright page object
 * @param {number} [timeout=DEFAULT_TIMEOUT] - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>} True if API is available, false if timeout is reached
 */
async function waitForBrowseApi(page, timeout = DEFAULT_TIMEOUT) {
  try {
    await page.waitForFunction(() => typeof window !== "undefined" && !!window.__TEST_API?.browse, {
      timeout
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Call a method on the browse test API with optional availability waiting.
 *
 * @pseudocode
 * 1. Optionally wait for API availability before attempting invocation
 * 2. Evaluate within the page context to retrieve the API and target method
 * 3. Validate the method exists and is callable, then invoke with provided args
 *
 * @param {import("@playwright/test").Page} page - The Playwright page object
 * @param {string} method - The name of the API method to call
 * @param {Array} [args=[]] - Arguments to pass to the API method
 * @param {{ waitForApi?: boolean, timeout?: number }} [options={}] - Configuration options
 * @param {boolean} [options.waitForApi=true] - Whether to wait for API availability
 * @param {number} [options.timeout] - Optional timeout override for API availability checks
 * @returns {Promise<unknown>} The result of the API call
 */
async function callBrowseApi(page, method, args = [], { waitForApi = true, timeout } = {}) {
  const waitTimeout =
    typeof timeout === "number" && Number.isFinite(timeout) && timeout >= 0 ? timeout : undefined;
  const available = waitForApi ? await waitForBrowseApi(page, waitTimeout) : true;
  if (!available) {
    throw new Error("Browse test API is not available on window.__TEST_API.");
  }

  return page.evaluate(
    ({ method, args: callArgs }) => {
      const browseApi = window.__TEST_API?.browse;
      if (!browseApi) {
        throw new Error("Browse test API is not available on window.__TEST_API.");
      }
      const target = browseApi[method];
      if (typeof target !== "function") {
        throw new Error(`Browse test API method not callable: ${method}`);
      }
      return target(...callArgs);
    },
    { method, args }
  );
}

/**
 * Ensure the browse carousel is ready and return its readiness snapshot.
 *
 * @pseudocode
 * 1. Wait for the browse test API to register on the window object
 * 2. Call the `whenCarouselReady` method via the browse test API
 * 3. Assert the readiness flag is true and return the snapshot for callers
 *
 * @param {import("@playwright/test").Page} page - The Playwright page object
 * @param {{ timeout?: number }} [options] - Optional timeout override in milliseconds
 * @returns {Promise<object>} Readiness snapshot returned by the API
 */
export async function ensureBrowseCarouselReady(page, { timeout } = {}) {
  const waitTimeout =
    typeof timeout === "number" && Number.isFinite(timeout) && timeout >= 0 ? timeout : undefined;
  const available = await waitForBrowseApi(page, waitTimeout);
  if (!available) {
    throw new Error("Browse test API did not register before readiness check.");
  }
  const callArgs = waitTimeout !== undefined ? [{ timeout: waitTimeout }] : [];
  const snapshot = await callBrowseApi(page, "whenCarouselReady", callArgs, {
    waitForApi: false,
    timeout: waitTimeout
  });
  expect(snapshot?.isReady).toBe(true);
  return snapshot;
}

/**
 * Disable hover animations through the browse test API.
 *
 * @pseudocode
 * 1. Invoke the `disableHoverAnimations` method on the browse test API
 * 2. Rely on `callBrowseApi` for availability checks and execution
 *
 * @param {import("@playwright/test").Page} page - The Playwright page object
 * @returns {Promise<void>} Resolves when the API call completes
 */
export async function disableBrowseHoverAnimations(page) {
  await callBrowseApi(page, "disableHoverAnimations");
}

/**
 * Reset browse test state if the API is available.
 *
 * @pseudocode
 * 1. Attempt to call the browse test API `reset` method without forcing availability waits
 * 2. Swallow known transient errors caused by navigation or teardown
 *
 * @param {import("@playwright/test").Page} page - The Playwright page object
 * @returns {Promise<void>} Resolves after attempting reset, even if API is unavailable
 */
export async function resetBrowseTestState(page) {
  try {
    await callBrowseApi(page, "reset", [], { waitForApi: false });
  } catch (error) {
    if (
      error instanceof Error &&
      (/Execution context was destroyed/i.test(error.message) ||
        /not available/i.test(error.message) ||
        /Cannot read properties of undefined/i.test(error.message))
    ) {
      return;
    }
    throw error;
  }
}

/**
 * Add a browse card using the browse test API.
 *
 * @pseudocode
 * 1. Delegate to the `addCard` browse API method with the provided judoka
 * 2. Let `callBrowseApi` manage waiting and execution semantics
 *
 * @param {import("@playwright/test").Page} page - The Playwright page object
 * @param {object} judoka - Judoka data used to create the card
 * @returns {Promise<void>} Resolves after the card is added
 */
export async function addBrowseCard(page, judoka) {
  await callBrowseApi(page, "addCard", [judoka]);
}

/**
 * Clear all browse cards using the browse test API.
 *
 * @param {import("@playwright/test").Page} page - The Playwright page object
 * @param {{ appendEmptyState?: boolean }} [options] - Optional configuration to append the empty-state message
 * @returns {Promise<unknown>} Result payload from the browse test API
 */
export async function clearBrowseCarousel(page, options = {}) {
  return callBrowseApi(page, "clearCarouselCards", [options]);
}
