/**
 * Dispatches a battle event through the Test API.
 * @param {import("@playwright/test").Page} page
 * @param {string} eventName
 * @pseudocode
 * 1. Evaluate in browser context
 * 2. Check if Test API state is available
 * 3. Call dispatchBattleEvent with proper promise handling
 * 4. Return normalized result with ok/result/reason structure
 */
export async function dispatchBattleEvent(page, eventName) {
  return await page.evaluate((event) => {
    return new Promise((resolve) => {
      const api = window.__TEST_API?.state;
      if (!api || typeof api.dispatchBattleEvent !== "function") {
        resolve({ ok: false, result: null, reason: "state.dispatchBattleEvent unavailable" });
        return;
      }

      try {
        const result = api.dispatchBattleEvent(event);
        if (result && typeof result.then === "function") {
          result
            .then((value) => {
              resolve({ ok: value !== false, result: value ?? null, reason: null });
            })
            .catch((error) => {
              resolve({
                ok: false,
                result: null,
                reason: error?.message ?? "dispatch failed"
              });
            });
        } else {
          resolve({ ok: result !== false, result: result ?? null, reason: null });
        }
      } catch (error) {
        resolve({ ok: false, result: null, reason: error?.message ?? "dispatch failed" });
      }
    });
  }, eventName);
}

/**
 * Completes a battle round via the CLI Test API.
 * @param {import("@playwright/test").Page} page
 * @param {object} [roundInput]
 * @pseudocode
 * 1. Evaluate in browser context with input parameters
 * 2. Check if CLI Test API is available
 * 3. Merge default options with input options
 * 4. Call completeRound with proper promise handling
 * 5. Return normalized result checking for "roundOver" state
 */
export async function completeRoundViaApi(page, roundInput = {}) {
  return await page.evaluate((input) => {
    return new Promise((resolve) => {
      const cliApi = window.__TEST_API?.cli;
      if (!cliApi || typeof cliApi.completeRound !== "function") {
        resolve({
          ok: false,
          reason: "cli.completeRound unavailable",
          finalState: null
        });
        return;
      }

      try {
        const options = {
          opponentResolveDelayMs: input?.opponentResolveDelayMs ?? 0,
          ...(input?.options ?? {})
        };

        if (Object.hasOwn(input ?? {}, "outcomeEvent")) {
          options.outcomeEvent = input.outcomeEvent;
        }

        const resolution = cliApi.completeRound(input ?? {}, options);
        const normalizeResolution = (result) => {
          const finalState = result?.finalState ?? null;
          const roundOverSeen = result?.roundOverObserved === true;
          const ok =
            roundOverSeen ||
            finalState === "roundOver" ||
            finalState === "cooldown" ||
            finalState === "matchDecision" ||
            finalState === "matchOver";
          resolve({
            ok,
            reason: null,
            finalState,
            roundOverObserved: roundOverSeen
          });
        };

        if (resolution && typeof resolution.then === "function") {
          resolution.then(normalizeResolution).catch((error) => {
            resolve({
              ok: false,
              reason: error?.message ?? "completeRound failed",
              finalState: null
            });
          });
        } else {
          normalizeResolution(resolution);
        }
      } catch (error) {
        resolve({
          ok: false,
          reason: error?.message ?? "completeRound failed",
          finalState: null
        });
      }
    });
  }, roundInput);
}

/**
 * Reads the rounds played counter via the Test API.
 * @param {import("@playwright/test").Page} page
 * @pseudocode
 * 1. Evaluate in browser context
 * 2. Check if Test API state getRoundsPlayed is available
 * 3. Convert result to number and validate it's finite
 * 4. Return valid number or null if unavailable/invalid
 */
export async function readRoundsPlayed(page) {
  return await page.evaluate(() => {
    const getRounds = window.__TEST_API?.state?.getRoundsPlayed;
    if (typeof getRounds === "function") {
      const value = Number(getRounds());
      return Number.isFinite(value) ? value : null;
    }
    return null;
  });
}

/**
 * Reads the cooldown countdown value via the Test API.
 * @param {import("@playwright/test").Page} page
 * @pseudocode
 * 1. Evaluate in browser context
 * 2. Check if Test API timers getCountdown is available
 * 3. Call getter function if available
 * 4. Return countdown value or null if unavailable
 */
export async function readCountdown(page) {
  return await page.evaluate(() => {
    const getter = window.__TEST_API?.timers?.getCountdown;
    return typeof getter === "function" ? getter() : null;
  });
}

/**
 * Resolves the current battle state via the Test API.
 * @param {import("@playwright/test").Page} page
 * @pseudocode
 * 1. Evaluate in browser context
 * 2. Try to get battle state from Test API
 * 3. Return state or null if unavailable/error
 */
export async function resolveBattleState(page) {
  return await page.evaluate(() => {
    try {
      return window.__TEST_API?.state?.getBattleState?.() ?? null;
    } catch {
      // Failed to resolve battle state - error handled by returning null
      return null;
    }
  });
}
