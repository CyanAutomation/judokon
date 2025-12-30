/**
 * Helper functions for replacing DOM state polling with direct Test API access
 */

export const STAT_WAIT_TIMEOUT_MS = 5_000;
export const MATCH_COMPLETION_TIMEOUT_MS = 30_000;
const BATTLE_CLI_RESET_BINDING = "__onBattleCliReset";

const battleCliResetChannelKey = Symbol("battleCliResetChannel");

function createDeferred() {
  /** @type {(value: any) => void} */
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return {
    promise,
    resolve: /** @param {any} value */ (value) => resolve(value)
  };
}

/**
 * @param {Promise} promise - The promise to race against timeout
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} message - Error message to throw on timeout
 * @param {import('@playwright/test').Page | Function} wait - Playwright page object or custom wait function
 */
async function withTimeout(promise, timeoutMs, message, wait) {
  const waitForFunction =
    typeof wait === "function" ? wait : wait?.waitForFunction?.bind(wait);

  if (!waitForFunction) {
    // Fallback to original setTimeout behavior for backward compatibility
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  }

  const timeoutPromise = waitForFunction(() => false, { timeout: timeoutMs }).catch(() => {
    throw new Error(message);
  });

  return await Promise.race([promise, timeoutPromise]);
}
}

function isValidMatchCompletionPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const { eventName, timedOut, elapsedMs, dom } = payload;

  if (typeof timedOut !== "boolean") {
    return false;
  }

  if (typeof eventName !== "string" || eventName.trim().length === 0) {
    return false;
  }

  if ("elapsedMs" in payload && !Number.isFinite(Number(elapsedMs))) {
    return false;
  }

  if (timedOut === false && dom !== null && typeof dom !== "object") {
    return false;
  }

  return true;
}

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
 * Create (or reuse) a channel for receiving Battle CLI reset completion events.
 * @pseudocode
 * REUSE an existing channel attached to the page when present.
 * EXPOSE a binding so the page can notify when the reset completes.
 * AUTO-RESET the underlying promise after each notification to support multiple waits.
 * PROVIDE waitForReset + signalReset helpers for tests and fixtures.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<{ waitForReset: (timeout?: number) => Promise<any>, signalReset: (payload: any) => Promise<void> }>} Channel helpers
 */
export async function ensureBattleCliResetChannel(page) {
  if (page[battleCliResetChannelKey]) {
    return page[battleCliResetChannelKey];
  }

  let deferred = createDeferred();

  await page.exposeBinding(BATTLE_CLI_RESET_BINDING, (_source, payload) => {
    deferred.resolve(payload);
  });

  const waitForReset = async (timeout = 5_000) => {
    const currentDeferred = deferred;
    const result = await withTimeout(
      currentDeferred.promise,
      timeout,
      `Timed out waiting for Battle CLI reset after ${timeout}ms`,
      page
    );
    const nextDeferred = createDeferred();
    deferred = nextDeferred;
    return result;
  };

  const signalReset = async (payload) => {
    try {
      await page.evaluate(
        ({ bindingName, data }) => {
          const notifier = window[bindingName];
          if (typeof notifier !== "function") {
            throw new Error(`Reset notifier ${bindingName} not available on window`);
          }
          notifier(data);
        },
        { bindingName: BATTLE_CLI_RESET_BINDING, data: payload }
      );
    } catch (error) {
      if (error.message?.includes("Target page, context or browser has been closed")) {
        deferred.resolve({ ok: false, error: "Page context destroyed" });
        return;
      }
      throw error;
    }
  };

  const channel = { waitForReset, signalReset };
  page[battleCliResetChannelKey] = channel;
  return channel;
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
    async ({ waitTimeout }) => {
      try {
        const initApi = window.__TEST_API?.init;
        if (initApi && typeof initApi.waitForBattleReady === "function") {
          return await initApi.waitForBattleReady.call(initApi, waitTimeout);
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
 * Configure the Classic Battle environment using the Test API helper.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} battleConfig - Configuration options for the battle setup
 * @param {object} [options] - Options object
 * @param {number} [options.timeout=10_000] - Timeout in ms
 * @returns {Promise<{ok: boolean, errors: string[]}>} Configuration result
 */
export async function configureClassicBattle(page, battleConfig = {}, options = {}) {
  const { timeout = 10_000 } = options;

  await waitForTestApi(page, { timeout });

  const result = await page.evaluate(
    async ({ config, waitTimeout }) => {
      try {
        const initApi = window.__TEST_API?.init;
        if (!initApi || typeof initApi.configureClassicBattle !== "function") {
          return { ok: false, errors: ["configureClassicBattle unavailable"] };
        }

        const { battleReadyTimeout, ...rest } = config ?? {};
        const configuration = {
          ...rest,
          battleReadyTimeout: battleReadyTimeout ?? waitTimeout
        };

        const outcome = await initApi.configureClassicBattle(configuration);
        const messages = Array.isArray(outcome?.errors) ? outcome.errors.filter(Boolean) : [];
        const ok = outcome?.ok !== false && messages.length === 0;

        return { ok, errors: messages };
      } catch (error) {
        return {
          ok: false,
          errors: [error instanceof Error ? error.message : String(error ?? "unknown error")]
        };
      }
    },
    { config: battleConfig, waitTimeout: timeout }
  );

  if (!result?.ok) {
    const messages = Array.isArray(result?.errors) ? result.errors.filter(Boolean) : [];
    const reason =
      messages.length > 0 ? messages.join(", ") : "Classic battle configuration failed";
    throw new Error(reason);
  }

  return result;
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

  let testApiAvailable = true;
  let waitForApiError = null;
  try {
    await waitForTestApi(page, { timeout });
  } catch (error) {
    if (!allowFallback) {
      const message = error instanceof Error ? error.message : String(error ?? "unknown error");
      throw new Error(
        `Test API unavailable before waiting for battle state "${expectedState}" (${message})`
      );
    }
    testApiAvailable = false;
    waitForApiError = error;
  }

  let apiCallError = null;
  let actualApiResult = null;

  if (testApiAvailable) {
    const apiResult = await page.evaluate(
      async ({ state, waitTimeout }) => {
        try {
          const stateApi = window.__TEST_API?.state;
          if (!stateApi) {
            return { result: null, error: "stateApi not available" };
          }
          if (typeof stateApi.waitForBattleState !== "function") {
            return { result: null, error: "waitForBattleState not a function" };
          }
          // IMPORTANT: Must await the async waitForBattleState function
          const result = await stateApi.waitForBattleState.call(stateApi, state, waitTimeout);
          return { result, error: null };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return { result: null, error: errorMsg };
        }
      },
      { state: expectedState, waitTimeout: timeout }
    );

    if (apiResult?.error) {
      apiCallError = apiResult.error;
    }

    actualApiResult = apiResult?.result ?? null;

    if (actualApiResult === true) {
      return;
    }

    if (actualApiResult === false) {
      if (!allowFallback) {
        throw new Error(`Timed out waiting for battle state "${expectedState}" via Test API`);
      }
    } else if (actualApiResult === null && !allowFallback) {
      const errorInfo = apiCallError ? ` (${apiCallError})` : "";
      const msg = `Test API waitForBattleState unavailable for "${expectedState}"${errorInfo}`;
      throw new Error(msg);
    }
  } else if (!allowFallback) {
    const waitMessage =
      waitForApiError instanceof Error
        ? waitForApiError.message
        : String(waitForApiError ?? "unknown error");
    throw new Error(`Test API unavailable for battle state "${expectedState}" (${waitMessage})`);
  }

  if (!allowFallback) {
    return;
  }

  // DOM fallback: check document.body.dataset.battleState
  // This is the actual source of truth for battle state
  const diagnostics = await page.evaluate(() => {
    try {
      return {
        currentState: document.body?.dataset?.battleState,
        testApiAvailable: !!window.__TEST_API,
        stateApiAvailable: !!window.__TEST_API?.state,
        hasWaitForBattleState: typeof window.__TEST_API?.state?.waitForBattleState === "function"
      };
    } catch {
      return { error: "diagnostic check failed" };
    }
  });

  if (diagnostics.error) {
    throw new Error(
      `Failed to get diagnostics for state "${expectedState}". API error: ${diagnostics.error}`
    );
  }

  // Log diagnostics for debugging
  if (!diagnostics.testApiAvailable || !diagnostics.stateApiAvailable) {
    const msg = `Test API not fully available for state check. Diagnostics: ${JSON.stringify(diagnostics)}`;
    console.warn(msg);
  }

  // Additional diagnostic: show what state we're actually in
  if (diagnostics.currentState && diagnostics.currentState !== expectedState) {
    const msg = `waitForBattleState("${expectedState}") but actual state is "${diagnostics.currentState}"`;
    console.warn(msg);
  }

  await page.waitForFunction(
    (state) => {
      try {
        const currentState = document.body?.dataset?.battleState;
        return currentState === state;
      } catch {
        return false;
      }
    },
    expectedState,
    { timeout }
  );
}

/**
 * Wait for stat buttons to report ready using the Test API helper when available.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} options - Options object
 * @param {number} [options.timeout=STAT_WAIT_TIMEOUT_MS] - Timeout in ms
 * @returns {Promise<void>}
 */
export async function waitForStatButtonsReady(page, options = {}) {
  const { timeout = STAT_WAIT_TIMEOUT_MS } = options;

  await waitForTestApi(page, { timeout });

  const apiStatus = await page.evaluate(
    async ({ waitTimeout }) => {
      try {
        const stateApi = window.__TEST_API?.state;
        if (!stateApi || typeof stateApi.waitForStatButtonsReady !== "function") {
          return { status: "unavailable" };
        }

        const ready = await stateApi.waitForStatButtonsReady.call(stateApi, waitTimeout);
        if (ready === true) {
          return { status: "ready" };
        }

        if (ready === false) {
          return { status: "timeout" };
        }

        return { status: "unknown", value: ready };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "unknown error");
        return { status: "error", message };
      }
    },
    { waitTimeout: timeout }
  );

  if (apiStatus?.status === "ready") {
    return;
  }

  const reason =
    apiStatus?.status === "timeout"
      ? `timed out after ${timeout}ms`
      : apiStatus?.status === "unavailable"
        ? "Test API waitForStatButtonsReady unavailable"
        : apiStatus?.status === "error"
          ? apiStatus.message
          : apiStatus?.status === "unknown"
            ? `Unexpected status: ${String(apiStatus.value)}`
            : "Unknown error waiting for stat buttons";

  throw new Error(`Stat buttons did not report ready via Test API (${reason})`);
}

/**
 * Wait for match completion payload using the Test API when available.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} options - Options object
 * @param {number} [options.timeout=MATCH_COMPLETION_TIMEOUT_MS] - Timeout in ms
 * @param {boolean} [options.allowFallback=false] - Allow DOM fallback when Test API unavailable
 * @returns {Promise<object>} Match completion payload
 */
export async function waitForMatchCompletion(page, options = {}) {
  const { timeout = MATCH_COMPLETION_TIMEOUT_MS, allowFallback = false } = options;

  const startTime = Date.now();
  await waitForTestApi(page, { timeout });

  const payload = await page.evaluate(
    ({ waitTimeout }) => {
      try {
        const stateApi = window.__TEST_API?.state;
        if (stateApi && typeof stateApi.waitForMatchCompletion === "function") {
          return stateApi.waitForMatchCompletion.call(stateApi, waitTimeout);
        }
      } catch {}
      return null;
    },
    { waitTimeout: timeout }
  );

  if (isValidMatchCompletionPayload(payload)) {
    return payload;
  }

  if (!allowFallback) {
    throw new Error("Test API waitForMatchCompletion unavailable and fallback disabled");
  }

  const remainingTimeout = Math.max(0, timeout - (Date.now() - startTime));
  const selectorTimeout = Math.max(1, remainingTimeout);
  await page.waitForSelector("#match-end-modal", { timeout: selectorTimeout });

  return {
    eventName: "match.concluded",
    detail: null,
    scores: null,
    winner: null,
    reason: "fallback-dom-polling",
    elapsedMs: Date.now() - startTime,
    timedOut: false,
    dom: null
  };
}

/**
 * Create a reusable tracker that resolves when the match completion payload is available.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} [options] - Options object forwarded to waitForMatchCompletion
 * @returns {{
 *   promise: Promise<object>,
 *   isComplete: () => boolean,
 *   hasError: () => boolean
 * }} Tracker utilities
 */
export function createMatchCompletionTracker(page, options = {}) {
  let completed = false;
  let errored = false;

  const promise = waitForMatchCompletion(page, options)
    .then((payload) => {
      completed = true;
      return payload;
    })
    .catch((error) => {
      completed = true;
      errored = true;
      throw error;
    });

  return {
    promise,
    isComplete: () => completed,
    hasError: () => errored
  };
}

/**
 * Set the Classic Battle points-to-win target using the Test API.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {number} pointsToWin - Target number of points required to win the match
 * @param {object} [options] - Options object
 * @param {number} [options.timeout=5_000] - Timeout in ms
 * @param {boolean} [options.confirm=true] - Confirm target via waitForPointsToWin when available
 * @returns {Promise<void>}
 */
export async function setPointsToWin(page, pointsToWin, options = {}) {
  const { timeout = 5_000, confirm = true } = options;

  if (!Number.isFinite(Number(pointsToWin))) {
    throw new Error(`Invalid pointsToWin value: ${pointsToWin}`);
  }

  await waitForTestApi(page, { timeout });

  const result = await page.evaluate(
    async ({ targetPoints, waitTimeout, shouldConfirm }) => {
      try {
        const engineApi = window.__TEST_API?.engine;
        if (!engineApi || typeof engineApi.setPointsToWin !== "function") {
          return { ok: false, reason: "engine.setPointsToWin unavailable" };
        }

        const applied = engineApi.setPointsToWin(targetPoints);
        if (!applied) {
          return { ok: false, reason: "engine.setPointsToWin returned false" };
        }

        if (shouldConfirm && typeof engineApi.waitForPointsToWin === "function") {
          const confirmed = await engineApi.waitForPointsToWin(targetPoints, waitTimeout);
          if (!confirmed) {
            return { ok: false, reason: "Timed out confirming pointsToWin" };
          }
        }

        return { ok: true, reason: null };
      } catch (error) {
        return {
          ok: false,
          reason: error instanceof Error ? error.message : String(error ?? "unknown error")
        };
      }
    },
    { targetPoints: Number(pointsToWin), waitTimeout: timeout, shouldConfirm: confirm !== false }
  );

  if (!result?.ok) {
    throw new Error(result?.reason ?? "Failed to set points-to-win target");
  }
}

/**
 * Read the Classic Battle points-to-win target from the Test API.
 * @pseudocode
 * WAIT for the Test API bootstrap to be available.
 * READ engine.getPointsToWin when present.
 * NORMALIZE the value to a finite number, otherwise return null.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {object} [options] - Options object
 * @param {number} [options.timeout=5_000] - Timeout in ms
 * @returns {Promise<number | null>} points-to-win target or null when unavailable
 */
export async function getPointsToWin(page, options = {}) {
  const { timeout = 5_000 } = options;

  await waitForTestApi(page, { timeout });

  return await page.evaluate(() => {
    try {
      const engine = window.__TEST_API?.engine;
      if (!engine || typeof engine.getPointsToWin !== "function") {
        return null;
      }
      const value = Number(engine.getPointsToWin());
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  });
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

/**
 * Get the configured opponent reveal delay in milliseconds.
 *
 * Queries the battle engine's opponent delay setting, which controls how long
 * to wait before revealing the opponent's choice in the Classic Battle UI.
 * This is useful for tests to understand the battle's timing behavior and
 * to assert on app configuration rather than on UI copy.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<number>} Opponent delay in milliseconds, or 0 if not configured.
 */
export async function getOpponentDelay(page) {
  return page.evaluate(() => {
    try {
      // Try to access via the battle engine or snackbar module
      if (typeof window !== "undefined" && window.__TEST_API?.state?.getOpponentDelay) {
        const result = window.__TEST_API.state.getOpponentDelay();
        const numeric = Number(result);
        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }
    } catch {}

    // Fallback: return default 0
    return 0;
  });
}

/**
 * Get the current player score.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<number | null>} Player score or null if unavailable.
 */
export async function getPlayerScore(page) {
  return page.evaluate(() => {
    try {
      if (typeof window !== "undefined" && window.__TEST_API?.state?.getPlayerScore) {
        const result = window.__TEST_API.state.getPlayerScore();
        const numeric = Number(result);
        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }
    } catch {}

    // Also try reading from the battle store directly
    try {
      const store = window.battleStore;
      if (store && Number.isFinite(store.playerScore)) {
        return Number(store.playerScore);
      }
    } catch {}

    return null;
  });
}

/**
 * Get the current opponent score.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<number | null>} Opponent score or null if unavailable.
 */
export async function getOpponentScore(page) {
  return page.evaluate(() => {
    try {
      if (typeof window !== "undefined" && window.__TEST_API?.state?.getOpponentScore) {
        const result = window.__TEST_API.state.getOpponentScore();
        const numeric = Number(result);
        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }
    } catch {}

    // Also try reading from the battle store directly
    try {
      const store = window.battleStore;
      if (store && Number.isFinite(store.opponentScore)) {
        return Number(store.opponentScore);
      }
    } catch {}

    return null;
  });
}

/**
 * Get the number of rounds played so far.
 *
 * @param {import("@playwright/test").Page} page
 * @returns {Promise<number | null>} Rounds played or null if unavailable.
 */
export async function getRoundsPlayed(page) {
  return page.evaluate(() => {
    try {
      if (typeof window !== "undefined" && window.__TEST_API?.state?.getRoundsPlayed) {
        const result = window.__TEST_API.state.getRoundsPlayed();
        const numeric = Number(result);
        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }
    } catch {}

    // Also try reading from the battle store directly
    try {
      const store = window.battleStore;
      if (store && Number.isFinite(store.roundsPlayed)) {
        return Number(store.roundsPlayed);
      }
    } catch {}

    return null;
  });
}
