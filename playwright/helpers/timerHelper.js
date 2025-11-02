/**
 * Reads the countdown value via the Test API timers helper.
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<number|null>}
 */
export async function getCountdownValue(page) {
  return await page.evaluate(() => {
    const timers = window.__TEST_API?.timers;
    if (!timers || typeof timers.getCountdown !== "function") {
      throw new Error(
        "__TEST_API.timers.getCountdown is not available; ensure timer helpers are exposed in the page context."
      );
    }

    return timers.getCountdown();
  });
}

/**
 * Waits for the countdown to reach the expected value using the Test API helper.
 * @param {import("@playwright/test").Page} page
 * @param {number|string|undefined} expectedValue
 * @param {{ timeoutMs?: number, pollIntervalMs?: number }|null} [options]
 * @returns {Promise<number|null>}
 */
export async function waitForCountdownValue(page, expectedValue, options) {
  return await page.evaluate(
    ({ expectedValue, options }) => {
      const timers = window.__TEST_API?.timers;
      if (!timers || typeof timers.waitForCountdown !== "function") {
        throw new Error(
          "__TEST_API.timers.waitForCountdown is not available; ensure wait helpers are exposed in the page context."
        );
      }

      return timers.waitForCountdown(expectedValue, options);
    },
    { expectedValue, options: options ?? undefined }
  );
}
