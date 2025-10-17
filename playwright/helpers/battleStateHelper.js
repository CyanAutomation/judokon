/**
 * Helper functions for replacing DOM state polling with direct Test API access
 */

export const STAT_WAIT_TIMEOUT_MS = 5_000;

/**
 * Safely read the current battle state via the Test API, returning a structured result.
 * @pseudocode
 * EVALUATE within the browser context to read window.__TEST_API.state.getBattleState.
 * RETURN an object containing the battle state when available.
 * CAPTURE and surface any thrown error messages for clearer diagnostics.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<{ok: boolean, state: string | null, reason: string | null}>}
 */
export async function getBattleStateWithErrorHandling(page) {
  return await page.evaluate(() => {
    try {
      const state = window.__TEST_API?.state?.getBattleState?.() ?? null;
      return {
        ok: state !== null,
        state,
        reason: state === null ? "Battle state unavailable" : null
      };
    } catch (error) {
      return {
        ok: false,
        state: null,
        reason: error instanceof Error ? error.message : String(error ?? "unknown error")
      };
    }
  });
}

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
 * Wait for round stats availability using the Test API battle store.
 * @pseudocode
 * WAIT for the Playwright Test API bootstrap to be ready.
 * POLL the battle store for both fighters' stat objects.
 * NORMALIZE each observed stat key by trimming and lower-casing before reading values.
 * RESOLVE when both fighters report at least one finite numeric stat value.
 * RAISE a timeout error when no such stats are observed within the allotted time.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} [options] - Options object.
 * @param {number} [options.timeout=STAT_WAIT_TIMEOUT_MS] - Timeout in ms.
 * @returns {Promise<void>} Resolves once both fighters expose at least one finite stat.
 */
export async function waitForRoundStats(page, { timeout = STAT_WAIT_TIMEOUT_MS } = {}) {
  await waitForTestApi(page, { timeout });

  await page.waitForFunction(
    () => {
      try {
        const store = window.__TEST_API?.inspect?.getBattleStore?.() ?? window.battleStore;
        if (!store || typeof store !== "object") {
          return false;
        }

        const playerStats = store.currentPlayerJudoka?.stats ?? null;
        const opponentStats = store.currentOpponentJudoka?.stats ?? null;
        if (!playerStats || !opponentStats) {
          return false;
        }

        const keys = Array.from(
          new Set([...Object.keys(playerStats ?? {}), ...Object.keys(opponentStats ?? {})])
        );
        if (keys.length === 0) {
          return false;
        }

        const readStatValue = (stats, key) => {
          if (!stats || typeof stats !== "object") {
            return Number.NaN;
          }

          const normalizedKey = String(key).trim().toLowerCase();
          const direct = stats[key];
          if (Number.isFinite(Number(direct))) {
            return Number(direct);
          }

          if (
            normalizedKey !== key &&
            normalizedKey in stats &&
            Number.isFinite(Number(stats[normalizedKey]))
          ) {
            return Number(stats[normalizedKey]);
          }

          return Number.NaN;
        };

        const hasFiniteStat = (stats) =>
          keys.some((key) => Number.isFinite(readStatValue(stats, key)));

        return hasFiniteStat(playerStats) && hasFiniteStat(opponentStats);
      } catch {
        return false;
      }
    },
    { timeout }
  );
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
 * @pseudocode
 * QUERY the battle state from the Test API helper when available.
 * RETURN the Test API state when it is a non-empty string.
 * READ the mirrored DOM dataset battle state when available.
 * RESOLVE waiting-for-action → round-over transitions when a selection is completed.
 * FALL BACK to the raw API value (possibly nullish) or the mirrored DOM value.
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
      return resolveWaitingForPlayerAction(mirroredState);
    }

    if (viaApi !== undefined) {
      return viaApi;
    }

    return mirroredState ?? null;

    function resolveWaitingForPlayerAction(state) {
      if (state === "waitingForPlayerAction") {
        try {
          const selectionMade =
            window.__TEST_API?.inspect?.getBattleStore?.()?.selectionMade ??
            window.__TEST_API?.inspect?.getDebugInfo?.()?.store?.selectionMade ??
            null;
          if (selectionMade === true) {
            return "roundOver";
          }
        } catch {
          // Ignore inspection errors because store access may throw before initialization.
        }
      }
      return state;
    }
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
