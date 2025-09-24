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

  if (readyViaApi === false) {
    if (!allowFallback) {
      throw new Error("Timed out waiting for battle readiness via Test API");
    }
  } else if (readyViaApi === null && !allowFallback) {
    throw new Error("Test API waitForBattleReady unavailable and fallback disabled");
  }

  if (!allowFallback) {
    return;
  }

  await page.waitForFunction(
    () => {
      try {
        const bodyState = document.body?.dataset?.battleState || "";
        const statsReady =
          document.querySelector('#cli-stats[aria-busy="false"]') ||
          document.querySelector('[data-testid="battle-stats"][aria-busy="false"]');
        const hasBattleStateAttribute = document.querySelector("[data-battle-state]");
        return Boolean(bodyState && (statsReady || hasBattleStateAttribute));
      } catch {
        return false;
      }
    },
    { timeout }
  );
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

  if (apiResult === false) {
    if (!allowFallback) {
      throw new Error(`Timed out waiting for battle state "${expectedState}" via Test API`);
    }
  } else if (apiResult === null && !allowFallback) {
    throw new Error(`Test API waitForBattleState unavailable for "${expectedState}"`);
  }

  if (!allowFallback) {
    return;
  }

  await page.waitForSelector(`[data-battle-state="${expectedState}"]`, { timeout });
}

/**
 * Wait for the Next button readiness using the Test API when available.
 * @pseudocode
 * WAIT for the Playwright Test API bootstrap.
 * QUERY the state helper for `waitForNextButtonReady` with the provided timeout.
 * THROW when the helper reports a timeout or is unavailable.
 * RETURN success otherwise.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} options - Options object
 * @param {number} options.timeout - Timeout in ms (default: 5_000)
 * @returns {Promise<void>}
 */
export async function waitForNextButtonReady(page, options = {}) {
  const { timeout = 5_000 } = options;

  await waitForTestApi(page, { timeout });

  const readyStatus = await page.evaluate(
    ({ waitTimeout }) => {
      try {
        const stateApi = window.__TEST_API?.state;
        if (stateApi && typeof stateApi.waitForNextButtonReady === "function") {
          return stateApi.waitForNextButtonReady.call(stateApi, waitTimeout);
        }
      } catch {
        return false;
      }
      return null;
    },
    { waitTimeout: timeout }
  );

  if (readyStatus === true) {
    return;
  }

  if (readyStatus === false) {
    throw new Error(`Next button did not report ready within ${timeout}ms via Test API`);
  }

  throw new Error("Test API waitForNextButtonReady unavailable in current context");
}

/**
 * Get current battle state using Test API or DOM fallback
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<string|null>} Current battle state
 */
export async function getCurrentBattleState(page) {
  return await page.evaluate(() => {
    const stateApi = window.__TEST_API?.state;
    const viaApi =
      typeof stateApi?.getBattleState === "function" ? stateApi.getBattleState() : undefined;

    if (typeof viaApi === "string" && viaApi) {
      return viaApi;
    }

    const dataset = document.body?.dataset;
    const mirroredState = dataset?.battleState;
    if (typeof mirroredState === "string" && mirroredState) {
      if (mirroredState === "waitingForPlayerAction") {
        try {
          const selectionMade =
            window.__TEST_API?.inspect?.getBattleStore?.()?.selectionMade ??
            window.__TEST_API?.inspect?.getDebugInfo?.()?.store?.selectionMade ??
            null;
          if (selectionMade === true) {
            return "roundOver";
          }
        } catch {}
      }
      return mirroredState;
    }

    if (viaApi !== undefined) {
      return viaApi;
    }

    return mirroredState ?? null;
  });
}

/**
 * Trigger battle state transition using Test API
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} event - Event to trigger
 * @returns {Promise<boolean>} Success status
 */
export async function triggerStateTransition(page, event) {
  return await page.evaluate(async (eventName) => {
    const stateApi = window.__TEST_API?.state;
    if (!stateApi) {
      return false;
    }

    if (typeof stateApi.triggerStateTransition === "function") {
      try {
        stateApi.triggerStateTransition(eventName);
        return true;
      } catch {
        return false;
      }
    }

    if (typeof stateApi.dispatchBattleEvent === "function") {
      try {
        const result = await stateApi.dispatchBattleEvent(eventName);
        return result !== false;
      } catch {
        return false;
      }
    }

    return false;
  }, event);
}
