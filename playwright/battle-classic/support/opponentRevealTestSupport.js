import { expect } from "@playwright/test";
import selectors from "../../helpers/selectors.js";
import {
  waitForBattleState,
  waitForBattleReady,
  getCurrentBattleState,
  triggerStateTransition
} from "../../helpers/battleStateHelper.js";

export const MUTED_CONSOLE_LEVELS = ["log", "info", "warn", "error", "debug"];
export const PLAYER_SCORE_PATTERN = /You:\s*\d/;

export async function setOpponentResolveDelay(page, delayMs) {
  const result = await page.evaluate((value) => {
    const timerApi = window.__TEST_API?.timers;
    if (!timerApi || typeof timerApi.setOpponentResolveDelay !== "function") {
      return { success: false, error: "API_UNAVAILABLE" };
    }

    try {
      const applied = timerApi.setOpponentResolveDelay(value);
      return { success: applied === true, error: null };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }, delayMs);

  if (!result.success) {
    const errorMsg =
      result.error === "API_UNAVAILABLE"
        ? "Test API setOpponentResolveDelay unavailable - ensure test environment is properly initialized"
        : `Failed to set opponent resolve delay: ${result.error}`;
    throw new Error(errorMsg);
  }

  expect(result.success).toBe(true);
}

export async function getBattleSnapshot(page) {
  return await page.evaluate(() => {
    const inspectApi = window.__TEST_API?.inspect;
    if (!inspectApi) return null;

    const toNumber = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const store = inspectApi.getBattleStore?.();
    const debug = inspectApi.getDebugInfo?.() ?? null;

    const extractValue = (key, transform = (v) => v) => {
      if (store && store[key] !== undefined) {
        return transform(store[key]);
      }
      if (debug?.store?.[key] !== undefined) {
        return transform(debug.store[key]);
      }
      return null;
    };

    return {
      roundsPlayed: extractValue("roundsPlayed", toNumber),
      selectionMade: extractValue("selectionMade"),
      playerScore: extractValue("playerScore", toNumber),
      opponentScore: extractValue("opponentScore", toNumber)
    };
  });
}

/**
 * @internal
 * Attempts to confirm the battle is ready, using fallbacks when primary readiness
 * checks fail. This helper augments {@link waitForBattleReady} with visibility and
 * snapshot heuristics to guard against intermittent initialization flakiness.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {{ timeout?: number }} [options] - Configuration for readiness deadline
 * @returns {Promise<void>}
 */
async function waitForBattleReadyWithFallbacks(page, options = {}) {
  const { timeout = 3_500 } = options;

  try {
    await waitForBattleReady(page, { timeout, allowFallback: false });
    return;
  } catch (originalError) {
    const { statVisible, readinessViaApi, snapshotLooksReady, errors } =
      await collectBattleReadinessFallbacks(page);

    if (readinessViaApi === true || (statVisible && snapshotLooksReady)) {
      return;
    }

    const aggregatedErrors = [originalError, ...errors];

    throw new AggregateError(aggregatedErrors, buildBattleFallbackFailureMessage(errors));
  }
}

async function collectBattleReadinessFallbacks(page) {
  const errors = [];

  const firstStat = page.locator(selectors.statButton(0)).first();
  let statVisible = false;
  try {
    statVisible = await firstStat.isVisible();
  } catch (statError) {
    errors.push(new Error(`Stat visibility check failed: ${statError.message}`));
  }

  let readinessViaApi = null;
  try {
    readinessViaApi = await page.evaluate(() => {
      try {
        const initApi = window.__TEST_API?.init;
        if (initApi && typeof initApi.isBattleReady === "function") {
          return initApi.isBattleReady.call(initApi);
        }
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
      return null;
    });
  } catch (apiError) {
    errors.push(new Error(`Test API readiness check failed: ${apiError.message}`));
  }

  if (readinessViaApi && typeof readinessViaApi === "object" && "error" in readinessViaApi) {
    errors.push(new Error(`Test API readiness evaluation failed: ${readinessViaApi.error}`));
    readinessViaApi = null;
  }

  let snapshot = null;
  try {
    snapshot = await getBattleSnapshot(page);
  } catch (snapshotError) {
    errors.push(new Error(`Battle snapshot retrieval failed: ${snapshotError.message}`));
  }

  const snapshotLooksReady =
    snapshot !== null && typeof snapshot.roundsPlayed === "number" && snapshot.roundsPlayed >= 0;

  return { statVisible, readinessViaApi, snapshotLooksReady, errors };
}

function buildBattleFallbackFailureMessage(errors) {
  if (!errors.length) {
    return "Battle readiness quick check failed after fallback strategies.";
  }

  const detailMessage = errors.map((error) => `- ${error.message}`).join("\n");

  return ["Battle readiness quick check failed after fallback strategies.", detailMessage].join(
    "\n"
  );
}

export async function startMatch(page, selector) {
  const button = page.locator(selector);

  const ensureStatSelectionVisible = async () => {
    await expect(page.locator(selectors.statButton(0)).first()).toBeVisible({
      timeout: 7_000
    });
  };

  const ensureBattleReady = async () => {
    await waitForBattleReadyWithFallbacks(page);
    await ensureStatSelectionVisible();
  };

  let ensuredDuringFallback = false;

  try {
    await expect(button).toBeVisible({ timeout: 7_000 });
    await button.click();
  } catch (error) {
    const readyWithoutClick = await ensureBattleReady()
      .then(() => true)
      .catch(() => false);

    if (readyWithoutClick) {
      ensuredDuringFallback = true;
    } else {
      throw error;
    }
  }

  if (!ensuredDuringFallback) {
    try {
      await ensureBattleReady();
    } catch (error) {
      try {
        await ensureStatSelectionVisible();
      } catch {
        throw error;
      }
    }
  }
}

export async function startMatchAndAwaitStats(page, selector) {
  await startMatch(page, selector);
}

/**
 * @private
 * Resolves the active round using deterministic fallbacks. Prefers the public
 * CLI helpers exposed through the Test API and progressively escalates to
 * manual transitions when those are unavailable.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<void>}
 */
async function resolveRoundDeterministic(page) {
  const hasResolved = async () => {
    try {
      return (await getCurrentBattleState(page)) === "roundOver";
    } catch {
      return false;
    }
  };

  await page
    .evaluate(async () => {
      try {
        const api = window.__TEST_API;
        if (!api) return false;

        if (typeof api.cli?.resolveRound === "function") {
          await api.cli.resolveRound();
          return true;
        }

        return false;
      } catch {
        return false;
      }
    })
    .catch(() => false);

  if (await hasResolved()) {
    return;
  }

  let stateAfterCli = null;
  try {
    stateAfterCli = await getCurrentBattleState(page);
  } catch {
    stateAfterCli = null;
  }

  await triggerStateTransition(page, "roundResolved");

  if (await hasResolved()) {
    return;
  }

  let stateAfterTransition = stateAfterCli;
  try {
    stateAfterTransition = await getCurrentBattleState(page);
  } catch {
    stateAfterTransition = stateAfterCli;
  }

  const waitingForPlayerActionDetected =
    stateAfterCli === "waitingForPlayerAction" ||
    stateAfterTransition === "waitingForPlayerAction";

  if (waitingForPlayerActionDetected && (await hasResolved())) {
    return;
  }

  try {
    if (await hasResolved()) {
      return;
    }

    const nextBtn = page.locator("#next-button");
    if (!(await nextBtn.isEnabled().catch(() => false))) {
      return;
    }

    let latestState = stateAfterTransition;
    if (!waitingForPlayerActionDetected) {
      latestState = await getCurrentBattleState(page).catch(() => stateAfterTransition);
    }

    if (latestState && latestState !== "waitingForPlayerAction") {
      if (await hasResolved()) {
        return;
      }
    }

    await nextBtn.click();
  } catch {}
}

export async function ensureRoundResolved(page, options = {}) {
  const { deadline = 650, verifyTimeout = 3_000, forceResolve = false } = options;

  const confirmRoundOver = async () => {
    await expect
      .poll(
        async () => {
          try {
            return await getCurrentBattleState(page);
          } catch {
            return null;
          }
        },
        {
          timeout: verifyTimeout,
          message: 'Expected battle state to be "roundOver" after deterministic resolution'
        }
      )
      .toBe("roundOver");
  };

  if (!forceResolve) {
    try {
      await waitForBattleState(page, "roundOver", {
        timeout: deadline
      });
      return;
    } catch {}
  }

  await resolveRoundDeterministic(page);
  await confirmRoundOver();
}

/**
 * Initialize the classic battle Playwright environment with deterministic timers
 * and feature configuration.
 * @pseudocode
 * ADD init script to configure timer overrides, cooldowns, resolve delay, and feature flags
 * NAVIGATE to the classic battle page and wait for network idle state
 * START the battle match via the provided selector, optionally waiting for stat readiness
 * APPLY opponent resolve delay through the public Test API when configured
 *
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @param {Object} [config] - Battle initialization configuration
 * @param {string} [config.matchSelector="#round-select-1"] - Selector used to start the match
 * @param {Object} [config.timerOverrides] - Timer override configuration applied via init script
 * @param {number} [config.nextRoundCooldown] - Cooldown duration between rounds in ms
 * @param {number} [config.resolveDelay] - Opponent resolve delay applied after initialization
 * @param {Object} [config.featureFlags] - Feature flag overrides merged with defaults
 * @param {boolean} [config.awaitStats=true] - Whether to wait for stat buttons to become visible
 * @returns {Promise<void>}
 */
export async function initializeBattle(page, config = {}) {
  const {
    matchSelector = "#round-select-1",
    timerOverrides = { roundTimer: 5 },
    nextRoundCooldown,
    resolveDelay,
    featureFlags = { showRoundSelectModal: true },
    awaitStats = true
  } = config;

  await page.addInitScript(
    ({ timers, cooldown, delay, flags }) => {
      window.__OVERRIDE_TIMERS = timers;
      if (typeof cooldown === "number") {
        window.__NEXT_ROUND_COOLDOWN_MS = cooldown;
      }
      if (typeof delay === "number") {
        window.__OPPONENT_RESOLVE_DELAY_MS = delay;
      }
      window.__FF_OVERRIDES = { showRoundSelectModal: true, ...flags };
      window.process = { env: { VITEST: "1" } };
    },
    {
      timers: timerOverrides,
      cooldown: nextRoundCooldown,
      delay: resolveDelay,
      flags: featureFlags
    }
  );

  await page.goto("/src/pages/battleClassic.html", { waitUntil: "networkidle" });

  if (awaitStats) {
    await startMatchAndAwaitStats(page, matchSelector);
  } else {
    await startMatch(page, matchSelector);
  }

  if (typeof resolveDelay === "number") {
    await setOpponentResolveDelay(page, resolveDelay);
  }
}

/**
 * Waits for the tracked rounds played count to reach the desired value using
 * battle snapshots, capturing diagnostic information for CI flakiness.
 * @pseudocode
 * POLL battle snapshot via public inspect API until roundsPlayed is a number
 * RECORD any snapshot retrieval errors to surface in assertion messaging
 * FALLBACK to reading battle state through the Test API when snapshots are null
 * ASSERT roundsPlayed meets or exceeds the expected threshold within timeout window
 *
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @param {number} expectedRounds - Target rounds played count
 * @param {{ timeout?: number }} [options] - Polling timeout configuration
 * @returns {Promise<void>}
 */
export async function waitForRoundsPlayed(page, expectedRounds, options = {}) {
  const { timeout = 5_000 } = options;
  let lastSnapshotError = null;
  let lastKnownState = null;
  const expectation = expect
    .poll(
      async () => {
        try {
          const snapshot = await getBattleSnapshot(page);
          if (snapshot && typeof snapshot.roundsPlayed === "number") {
            return snapshot.roundsPlayed;
          }
        } catch (error) {
          lastSnapshotError = error instanceof Error ? error.message : String(error);
        }

        try {
          lastKnownState = await page
            .evaluate(() => window.__TEST_API?.state?.getBattleState?.() ?? null)
            .catch(() => null);
        } catch {
          lastKnownState = null;
        }

        return null;
      },
      {
        timeout,
        message: `Expected rounds played to reach ${expectedRounds}`
      }
    )
    .toBeGreaterThanOrEqual(expectedRounds);

  try {
    await expectation;
  } catch (error) {
    const diagnostics = [
      lastKnownState ? `Last known battle state: ${lastKnownState}` : null,
      lastSnapshotError ? `Snapshot error: ${lastSnapshotError}` : null
    ]
      .filter(Boolean)
      .join("\n");

    if (error instanceof Error && diagnostics) {
      error.message = `${error.message}\n${diagnostics}`;
    }

    throw error;
  }
}
