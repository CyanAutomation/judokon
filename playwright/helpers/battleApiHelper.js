/**
 * Dispatches a battle event through the Test API.
 * @param {import("@playwright/test").Page} page
 * @param {string} eventName
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
          outcomeEvent: input?.outcomeEvent ?? "outcome=winPlayer",
          opponentResolveDelayMs: input?.opponentResolveDelayMs ?? 0,
          ...(input?.options ?? {})
        };

        const resolution = cliApi.completeRound(input ?? {}, options);
        const normalizeResolution = (result) => {
          resolve({
            ok: result?.finalState === "roundOver",
            reason: null,
            finalState: result?.finalState ?? null
          });
        };

        if (resolution && typeof resolution.then === "function") {
          resolution
            .then(normalizeResolution)
            .catch((error) => {
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
 * Resolves the current battle state via the Test API.
 * @param {import("@playwright/test").Page} page
 */
export async function resolveBattleState(page) {
  return await page.evaluate(() => {
    try {
      return window.__TEST_API?.state?.getBattleState?.() ?? null;
    } catch (error) {
      console.warn("Failed to resolve battle state:", error?.message ?? "unknown error");
      return null;
    }
  });
}

