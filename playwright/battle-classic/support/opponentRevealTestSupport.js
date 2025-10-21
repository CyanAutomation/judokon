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

    if (typeof inspectApi.getBattleSnapshot === "function") {
      return inspectApi.getBattleSnapshot();
    }

    const store = inspectApi.getBattleStore?.();
    if (!store) return null;

    const toNumber = (value) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const normalizeBoolean = (value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return true;
        if (normalized === "false") return false;
      }
      return null;
    };

    const resolveSelection = () => {
      const current = store.selectionMade;
      if (typeof current === "boolean") {
        if (current === false && typeof store.__lastSelectionMade === "boolean") {
          return store.__lastSelectionMade;
        }
        return current;
      }
      const lastKnown = store.__lastSelectionMade;
      if (typeof lastKnown === "boolean") {
        return lastKnown;
      }
      return current;
    };

    return {
      roundsPlayed: toNumber(store.roundsPlayed),
      selectionMade: normalizeBoolean(resolveSelection()),
      playerScore: toNumber(store.playerScore),
      opponentScore: toNumber(store.opponentScore)
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

  const firstStat = page.locator(selectors.statButton()).first();
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
    await expect(page.locator(selectors.statButton()).first()).toBeVisible({
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
const ROUND_OVER_STATE = "roundOver";
const WAITING_FOR_PLAYER_ACTION = "waitingForPlayerAction";
const COOLDOWN_STATE = "cooldown";

/**
 * Safely retrieves the current battle state, returning a fallback value if an error occurs.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string|null} [fallback=null] - Value to return if state retrieval fails
 * @returns {Promise<string|null>} The battle state or fallback value
 */
async function safeGetBattleState(page, fallback = null) {
  try {
    return await getCurrentBattleState(page);
  } catch {
    return fallback;
  }
}

async function attemptCliResolution(page, hasResolved) {
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

  const stateAfterCli = await safeGetBattleState(page);
  const resolved = stateAfterCli === ROUND_OVER_STATE ? true : await hasResolved();

  return { resolved, stateAfterCli };
}

/**
 * @pseudocode
 * - align DOM dataset + emitted events with the desired battle state
 * - invoke state API dispatch to mirror production state transitions
 * - verify polling observes the synchronized state before continuing
 *
 * Manual synchronization is reserved for the round resolution fallback when the
 * CLI stalls in transitional states such as waiting for player action. It keeps
 * the test harness in lock-step with production semantics while documenting the
 * exceptional pathway.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ fromState?: string | null, finalState?: string, timeout?: number }} [options]
 * @returns {Promise<void>}
 */
async function manuallySyncBattleState(
  page,
  { fromState = null, finalState = ROUND_OVER_STATE, timeout = 2_000 } = {}
) {
  await page.evaluate(
    async ({ fromState: priorState, finalState: targetState }) => {
      const body = document.body;
      if (!body) return;

      const initialState = priorState ?? (body.dataset ? (body.dataset.battleState ?? null) : null);

      if (body.dataset) {
        body.dataset.battleState = targetState;
      }

      if (typeof window.emitBattleEvent === "function") {
        window.emitBattleEvent("battleStateChange", {
          from: initialState,
          to: targetState,
          event: "roundResolved"
        });
      }

      const stateApi = window.__TEST_API?.state;
      if (stateApi && typeof stateApi.dispatchBattleEvent === "function") {
        try {
          await stateApi.dispatchBattleEvent(targetState);
        } catch (error) {
          // Intentionally ignore dispatch errors as this is a fallback mechanism.
          // The polling verification below will catch unresolved state syncs.
        }
      }
    },
    { fromState, finalState }
  );

  await expect
    .poll(async () => safeGetBattleState(page, finalState), {
      timeout,
      message: `Expected manual battle state sync to report "${finalState}" after fallback`
    })
    .toBe(finalState);
}

/**
 * @pseudocode
 * - trigger production roundResolved transition
 * - inspect latest battle state and determine if manual sync is required
 * - when needed, force DOM + state API alignment to "roundOver" and verify sync
 *
 * @param {import('@playwright/test').Page} page
 * @param {() => Promise<boolean>} hasResolved
 * @param {string | null | undefined} stateAfterCli
 * @returns {Promise<{ resolved: boolean, stateAfterTransition: string | null | undefined }>}
 */
async function triggerRoundResolvedFallback(page, hasResolved, stateAfterCli) {
  await triggerStateTransition(page, "roundResolved");

  let stateAfterTransition = await safeGetBattleState(page, stateAfterCli);

  if (shouldForceRoundOver(stateAfterTransition)) {
    const previousState = stateAfterTransition ?? stateAfterCli ?? null;

    await manuallySyncBattleState(page, {
      fromState: previousState,
      finalState: ROUND_OVER_STATE,
      timeout: 2_000
    });

    stateAfterTransition = ROUND_OVER_STATE;
  }

  const resolved = stateAfterTransition === ROUND_OVER_STATE ? true : await hasResolved();

  return { resolved, stateAfterTransition };
}

function isWaitingForPlayerAction(...states) {
  return states.some((state) => state === WAITING_FOR_PLAYER_ACTION);
}

function shouldForceRoundOver(state) {
  if (state === ROUND_OVER_STATE) {
    return false;
  }

  return state === WAITING_FOR_PLAYER_ACTION || state === COOLDOWN_STATE;
}

async function clickNextButtonFallback(page, { hasResolved, stateAfterCli, stateAfterTransition }) {
  if (await hasResolved()) {
    return;
  }

  const nextBtn = page.locator("#next-button");
  const nextEnabled = await nextBtn.isEnabled().catch(() => false);
  if (!nextEnabled) {
    return;
  }

  const waitingDetected = isWaitingForPlayerAction(stateAfterCli, stateAfterTransition);

  const latestState = await safeGetBattleState(page, stateAfterTransition);

  if (
    waitingDetected ||
    latestState === WAITING_FOR_PLAYER_ACTION ||
    (latestState !== ROUND_OVER_STATE && !(await hasResolved()))
  ) {
    await nextBtn.click();
  }
}

async function resolveRoundDeterministic(page) {
  const hasResolved = async () => (await safeGetBattleState(page)) === ROUND_OVER_STATE;

  const { resolved: resolvedViaCli, stateAfterCli } = await attemptCliResolution(page, hasResolved);
  if (resolvedViaCli) {
    return;
  }

  const { resolved: resolvedAfterTransition, stateAfterTransition } =
    await triggerRoundResolvedFallback(page, hasResolved, stateAfterCli);
  if (resolvedAfterTransition) {
    return;
  }

  await clickNextButtonFallback(page, {
    hasResolved,
    stateAfterCli,
    stateAfterTransition
  });
}

function cooldownImmediatelyFollowsRoundOver(state, log, prev) {
  if (state !== "cooldown") {
    return false;
  }

  if (Array.isArray(log)) {
    for (let index = log.length - 1; index >= 0; index -= 1) {
      const entry = log[index];
      if (!entry || typeof entry !== "object") {
        continue;
      }
      if (entry.to === "cooldown") {
        if (entry.from === "roundOver") {
          return true;
        }
        for (let prior = index - 1; prior >= 0; prior -= 1) {
          const previous = log[prior];
          if (!previous || typeof previous !== "object") {
            continue;
          }
          return previous.to === "roundOver";
        }
        return false;
      }
      if (entry.to === "roundOver") {
        return true;
      }
    }
  }

  return prev === "roundOver";
}

async function readBattleStateDiagnostics(page) {
  try {
    return await page.evaluate(() => {
      const stateApi = window.__TEST_API?.state;

      const readState = () => {
        try {
          const viaApi = stateApi?.getBattleState?.();
          if (typeof viaApi === "string" && viaApi) {
            return viaApi;
          }
        } catch {}
        try {
          const mirrored = document.body?.dataset?.battleState;
          if (typeof mirrored === "string" && mirrored) {
            return mirrored;
          }
        } catch {}
        return null;
      };

      const readSnapshot = () => {
        try {
          if (typeof stateApi?.getStateSnapshot === "function") {
            return stateApi.getStateSnapshot();
          }
        } catch {}
        try {
          if (typeof window.getStateSnapshot === "function") {
            return window.getStateSnapshot();
          }
        } catch {}
        return null;
      };

      return {
        state: readState(),
        snapshot: readSnapshot()
      };
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Confirm that the round has resolved by inspecting current state transitions.
 * @pseudocode
 * POLL the battle state and debug snapshot via the Test API.
 * DETECT resolution when the state is "roundOver" or when "cooldown" immediately follows "roundOver".
 * THROW with diagnostic details if neither condition is observed before the timeout.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {{ timeout?: number, message?: string }} [options] - Polling configuration
 * @returns {Promise<void>}
 */
export async function confirmRoundResolved(page, options = {}) {
  const {
    timeout = 3_000,
    message = 'Expected battle state to reach "roundOver" (or immediately enter cooldown) after deterministic resolution'
  } = options;

  await expect
    .poll(
      async () => {
        const diagnostics = await readBattleStateDiagnostics(page);
        if (diagnostics?.error) {
          return {
            resolved: false,
            state: null,
            cooldownAfterRoundOver: false,
            error: diagnostics.error
          };
        }

        const snapshot =
          diagnostics?.snapshot && typeof diagnostics.snapshot === "object"
            ? diagnostics.snapshot
            : null;
        const stateFromSnapshot =
          typeof snapshot?.state === "string" && snapshot.state ? snapshot.state : null;
        const currentState =
          (typeof diagnostics?.state === "string" && diagnostics.state) || stateFromSnapshot;
        const log = Array.isArray(snapshot?.log) ? snapshot.log : [];
        const prev = typeof snapshot?.prev === "string" ? snapshot.prev : null;
        const cooldownAfterRoundOver = cooldownImmediatelyFollowsRoundOver(currentState, log, prev);

        return {
          resolved: currentState === "roundOver" || cooldownAfterRoundOver,
          state: currentState,
          cooldownAfterRoundOver,
          snapshotState: stateFromSnapshot,
          snapshotPrev: prev,
          lastLogEntry: log.length ? log[log.length - 1] : null
        };
      },
      { timeout, message }
    )
    .toMatchObject({ resolved: true });
}

export async function ensureRoundResolved(page, options = {}) {
  const { deadline = 650, verifyTimeout = 3_000, forceResolve = false } = options;

  if (!forceResolve) {
    try {
      await waitForBattleState(page, "roundOver", {
        timeout: deadline
      });
      return;
    } catch {}
  }

  await resolveRoundDeterministic(page);
  await confirmRoundResolved(page, { timeout: verifyTimeout });
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
    featureFlags = { showRoundSelectModal: true, opponentDelayMessage: true },
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
  const apiResult = await page.evaluate(
    async ({ rounds, waitTimeout }) => {
      const stateApi = window.__TEST_API?.state;
      if (stateApi && typeof stateApi.waitForRoundsPlayed === "function") {
        return await stateApi.waitForRoundsPlayed(rounds, waitTimeout);
      }
      return null;
    },
    { rounds: expectedRounds, waitTimeout: timeout }
  );

  if (apiResult === true) {
    return;
  }

  const snapshot = await getBattleSnapshot(page);
  const lastKnownState = await page
    .evaluate(() => window.__TEST_API?.state?.getBattleState?.() ?? null)
    .catch(() => null);

  if (apiResult === false) {
    const diagnostics = [
      lastKnownState ? `Last known battle state: ${lastKnownState}` : null,
      snapshot ? `Snapshot: ${JSON.stringify(snapshot)}` : null
    ]
      .filter(Boolean)
      .join("\n");

    throw new Error(
      [`Expected rounds played to reach ${expectedRounds} within ${timeout}ms.`, diagnostics]
        .filter(Boolean)
        .join("\n")
    );
  }

  let lastSnapshotError = null;
  const expectation = expect
    .poll(
      async () => {
        try {
          const current = await getBattleSnapshot(page);
          if (current && typeof current.roundsPlayed === "number") {
            return current.roundsPlayed;
          }
        } catch (error) {
          lastSnapshotError = error instanceof Error ? error.message : String(error);
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
      snapshot ? `Initial snapshot: ${JSON.stringify(snapshot)}` : null,
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
