import { expect } from "@playwright/test";

/**
 * Invokes a timer helper method within the page's Test API context.
 * @param {import("@playwright/test").Page} page
 * @param {string} methodName
 * @param {unknown[]} [args] - Arguments to pass to the timer method
 * @returns {Promise<unknown | null>}
 */
async function callTimerApi(page, methodName, args = []) {
  if (!page) {
    throw new Error("Timer helpers require a valid Playwright page instance.");
  }

  return await page.evaluate(
    ({ methodName, args }) => {
      const timers = window.__TEST_API?.timers;
      if (!timers || typeof timers[methodName] !== "function") {
        throw new Error(
          `__TEST_API.timers.${methodName} is not available; ensure timer helpers are exposed in the page context.`
        );
      }

      const result = timers[methodName](...args);
      return result ?? null;
    },
    { methodName, args }
  );
}

/**
 * Reads the countdown value via the Test API timers helper.
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<number|null>}
 */
export async function getCountdownValue(page) {
  return await callTimerApi(page, "getCountdown");
}

/**
 * Waits for the countdown to reach the expected value using the Test API helper.
 * @param {import("@playwright/test").Page} page
 * @param {number|string|undefined} expectedValue
 * @param {{ timeoutMs?: number, pollIntervalMs?: number }|null} [options]
 * @returns {Promise<number|null>}
 */
export async function waitForCountdownValue(page, expectedValue, options) {
  const args = [expectedValue];
  if (typeof options !== "undefined") {
    args.push(options);
  }

  return await callTimerApi(page, "waitForCountdown", args);
}

/**
 * Waits for the countdown value to decrease below the provided baseline.
 * @param {import("@playwright/test").Page} page
 * @param {number} baselineValue
 * @param {{ timeoutMs?: number, pollIntervalMs?: number }|null} [options]
 * @returns {Promise<number>}
 */
export async function waitForCountdownDecrease(page, baselineValue, options) {
  if (!Number.isFinite(baselineValue)) {
    throw new Error("waitForCountdownDecrease requires a finite numeric baseline value.");
  }

  const pollOptions = options ?? {};
  const expectOptions = {};

  if (typeof pollOptions.timeoutMs === "number") {
    expectOptions.timeout = pollOptions.timeoutMs;
  }

  if (typeof pollOptions.pollIntervalMs === "number" && pollOptions.pollIntervalMs > 0) {
    expectOptions.intervals = [pollOptions.pollIntervalMs];
  }

  /** @type {number} */
  let latestObserved = baselineValue;

  await expect
    .poll(async () => {
      const nextValue = await getCountdownValue(page);
      if (typeof nextValue === "number") {
        latestObserved = nextValue;
        return nextValue;
      }

      // Returning null allows expect.poll to continue retrying until a numeric value appears
      // or until it times out, preventing an infinite loop when the countdown is unavailable.
      return null;
    }, expectOptions)
    .toBeLessThan(baselineValue);

  return latestObserved;
}
