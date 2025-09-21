/**
 * Helper functions for replacing DOM state polling with direct Test API access
 */

/**
 * Wait for the Playwright Test API bootstrap to be available on the page.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} options - Options object
 * @param {number} options.timeout - Timeout in ms (default: 10_000)
 * @returns {Promise<void>}
 */
export async function waitForTestApi(page, options = {}) {
  const { timeout = 10_000 } = options;

  await page.waitForFunction(
    () => {
      try {
        return typeof window !== "undefined" && typeof window.__TEST_API !== "undefined";
      } catch {
        return false;
      }
    },
    { timeout }
  );
}

/**
 * Wait for battle initialization using the Test API when available.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} options - Options object
 * @param {number} options.timeout - Timeout in ms (default: 10_000)
 * @param {boolean} options.allowFallback - Allow DOM fallback if Test API unavailable (default: true)
 * @returns {Promise<void>}
 */
export async function waitForBattleReady(page, options = {}) {
  const { timeout = 10_000, allowFallback = true } = options;

  await waitForTestApi(page, { timeout });

  const readyViaApi = await page.evaluate(
    ({ waitTimeout }) => {
      try {
        const initApi = window.__TEST_API?.init;
        if (initApi && typeof initApi.waitForBattleReady === "function") {
          return initApi.waitForBattleReady.call(initApi, waitTimeout);
        }
      } catch {}
      return null;
    },
    { waitTimeout: timeout }
  );

  if (readyViaApi === true) {
    return;
  }

  if (readyViaApi === false && !allowFallback) {
    throw new Error("Timed out waiting for battle readiness via Test API");
  }

  if (readyViaApi === false || readyViaApi === null) {
    if (!allowFallback) {
      throw new Error("Test API waitForBattleReady unavailable and fallback disabled");
    }

    await page.waitForFunction(
      () => {
        try {
          return (
            typeof window.__TEST_API?.init?.isBattleReady === "function" &&
            window.__TEST_API.init.isBattleReady()
          );
        } catch {
          return false;
        }
      },
      { timeout }
    );
  }
}

/**
 * Wait for battle state using Test API instead of DOM polling.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} expectedState - The state to wait for
 * @param {object} options - Options object
 * @param {number} options.timeout - Timeout in ms (default: 5_000)
 * @param {boolean} options.allowFallback - Allow DOM fallback if Test API unavailable (default: true)
 * @returns {Promise<void>}
 */
export async function waitForBattleState(page, expectedState, options = {}) {
  const { timeout = 5_000, allowFallback = true } = options;

  await waitForTestApi(page, { timeout });

  const apiResult = await page.evaluate(
    ({ state, waitTimeout }) => {
      try {
        const stateApi = window.__TEST_API?.state;
        if (stateApi && typeof stateApi.waitForBattleState === "function") {
          return stateApi.waitForBattleState.call(stateApi, state, waitTimeout);
        }
      } catch {}
      return null;
    },
    { state: expectedState, waitTimeout: timeout }
  );

  if (apiResult === true) {
    return;
  }

  if (apiResult === false && !allowFallback) {
    throw new Error(`Timed out waiting for battle state "${expectedState}" via Test API`);
  }

  if (apiResult === false || apiResult === null) {
    if (!allowFallback) {
      throw new Error(`Test API waitForBattleState unavailable for "${expectedState}"`);
    }

    await page.waitForSelector(`[data-battle-state="${expectedState}"]`, { timeout });
  }
}

/**
 * Get current battle state using Test API or DOM fallback
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<string|null>} Current battle state
 */
export async function getCurrentBattleState(page) {
  return await page.evaluate(() => {
    if (window.__TEST_API && window.__TEST_API.state) {
      return window.__TEST_API.state.getBattleState();
    }
    // Fallback to DOM
    return document.body?.dataset?.battleState || null;
  });
}

/**
 * Trigger battle state transition using Test API
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} event - Event to trigger
 * @returns {Promise<boolean>} Success status
 */
export async function triggerStateTransition(page, event) {
  return await page.evaluate((eventName) => {
    if (
      window.__TEST_API &&
      window.__TEST_API.state &&
      window.__TEST_API.state.triggerStateTransition
    ) {
      try {
        window.__TEST_API.state.triggerStateTransition(eventName);
        return true;
      } catch {
        // console.log("State transition failed:", error);
        return false;
      }
    }
    return false;
  }, event);
}
