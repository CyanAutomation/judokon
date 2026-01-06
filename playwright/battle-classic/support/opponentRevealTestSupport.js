import { expect } from "@playwright/test";
import selectors from "../../helpers/selectors.js";
import {
  waitForBattleState,
  waitForBattleReady,
  getBattleStateWithErrorHandling
} from "../../helpers/battleStateHelper.js";

export const MUTED_CONSOLE_LEVELS = ["log", "info", "warn", "error", "debug"];
export const PLAYER_SCORE_PATTERN = /You:\s*\d/;

// Timeout constants
const TIMEOUTS = {
  BATTLE_READY: 3_500,
  BUTTON_VISIBILITY: 7_000,
  STATE_DISPATCH_BUDGET: 750,
  STATE_SYNC: 2_000,
  ROUND_RESOLUTION_VERIFY: 3_000,
  ROUNDS_PLAYED_DEFAULT: 5_000,
  RESOLUTION_DEADLINE: 1500
};

// Battle state constants
const STATE_CONSTANTS = {
  ROUND_OVER: "roundOver",
  WAITING_FOR_PLAYER_ACTION: "waitingForPlayerAction",
  COOLDOWN: "cooldown",
  MATCH_DECISION: "matchDecision",
  MATCH_OVER: "matchOver"
};

const MATCH_END_STATES = [STATE_CONSTANTS.MATCH_DECISION, STATE_CONSTANTS.MATCH_OVER];

// State utility functions
const isMatchEndState = (state) => MATCH_END_STATES.includes(state);
const isRoundOverState = (state) => state === STATE_CONSTANTS.ROUND_OVER;
const isWaitingForPlayerAction = (...states) =>
  states.some((state) => state === STATE_CONSTANTS.WAITING_FOR_PLAYER_ACTION);

/**
 * Executes round resolution by calling the production resolution pipeline.
 * @pseudocode
 * - Retrieve battle store from Test API or global window
 * - Import resolveRound, getStatValue, and getOpponentJudoka helpers
 * - Extract player choice, player card, and opponent card from store
 * - Calculate stat values for both players
 * - Call resolveRound to execute full pipeline (outcome evaluation, score update, event emission)
 * - Return success status with reason if operation fails
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<{success: boolean, reason?: string}>} Resolution result
 */
async function executeRoundResolution(page) {
  return await page
    .evaluate(async () => {
      try {
        const store = window.__TEST_API?.inspect?.getBattleStore?.() ?? window.battleStore;
        if (!store || !store.playerChoice) {
          return { success: false, reason: "no_selection" };
        }

        const { resolveRound } = await import("/src/helpers/classicBattle/roundResolver.js");
        const { getStatValue } = await import("/src/helpers/battle/index.js");
        const { getOpponentJudoka } = await import("/src/helpers/classicBattle/cardSelection.js");

        const stat = store.playerChoice;
        const playerCard = store.playerCard;
        const opponentCard = getOpponentJudoka(store);

        if (!playerCard || !opponentCard) {
          return { success: false, reason: "missing_cards" };
        }

        const playerVal = getStatValue(playerCard, stat);
        const opponentVal = getStatValue(opponentCard, stat);

        await resolveRound(store, stat, playerVal, opponentVal);

        return { success: true };
      } catch (error) {
        return { success: false, reason: error.message || String(error), error: true };
      }
    })
    .catch((error) => ({ success: false, reason: String(error) }));
}

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

/**
 * Retrieves a normalized snapshot of the current battle state.
 * @pseudocode
 * - Access Test API inspect interface for battle snapshot
 * - If getBattleSnapshot exists, return it directly
 * - Otherwise, manually construct snapshot from battle store
 * - Normalize numeric values and boolean flags for consistency
 * - Handle selectionMade flag with fallback to last known value
 * - Return snapshot with roundsPlayed, selectionMade, playerScore, opponentScore
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @returns {Promise<{roundsPlayed: number|null, selectionMade: boolean|null, playerScore: number|null, opponentScore: number|null}|null>} Battle state snapshot or null if unavailable
 */
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
  const { timeout = TIMEOUTS.BATTLE_READY } = options;

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

/**
 * Starts a battle match by clicking the provided selector and ensures battle readiness.
 * @pseudocode
 * - Locate the start button using the provided selector
 * - Define helper to verify stat selection buttons are visible
 * - Define helper to ensure battle is ready using fallback strategies
 * - Attempt to click the start button with visibility check
 * - If click fails, verify battle is already ready without clicking
 * - After click (or fallback), ensure battle readiness and stat visibility
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - CSS selector for the start match button
 * @returns {Promise<void>}
 */
export async function startMatch(page, selector) {
  const button = page.locator(selector);

  const ensureStatSelectionVisible = async () => {
    await expect(page.locator(selectors.statButton()).first()).toBeVisible({
      timeout: TIMEOUTS.BUTTON_VISIBILITY
    });
  };

  const ensureBattleReady = async () => {
    await waitForBattleReadyWithFallbacks(page);
    await ensureStatSelectionVisible();
  };

  let battleReadyViaFallback = false;

  try {
    await expect(button).toBeVisible({ timeout: TIMEOUTS.BUTTON_VISIBILITY });
    await button.click();
  } catch (error) {
    const readyWithoutClick = await ensureBattleReady()
      .then(() => true)
      .catch(() => false);

    if (readyWithoutClick) {
      battleReadyViaFallback = true;
    } else {
      throw error;
    }
  }

  if (!battleReadyViaFallback) {
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

/**
 * Starts a battle match and waits for stat buttons to become visible.
 * @pseudocode
 * - Call startMatch with provided selector
 * - Internally ensures battle readiness and stat visibility
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} selector - CSS selector for the start match button
 * @returns {Promise<void>}
 */
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

/**
 * Safely retrieves the current battle state, returning a fallback value if an error occurs.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string|null} [fallback=null] - Value to return if state retrieval fails
 * @returns {Promise<string|null>} The battle state or fallback value
 */
async function safeGetBattleState(page, fallback = null) {
  try {
    const result = await getBattleStateWithErrorHandling(page);
    if (result && typeof result.state === "string") {
      return result.state || fallback;
    }
  } catch {
    // Swallow evaluation errors so callers fall back to the provided value.
  }

  return fallback;
}

async function attemptCliResolution(page) {
  await executeRoundResolution(page);

  const stateAfterCli = await safeGetBattleState(page);
  const resolved = stateAfterCli === STATE_CONSTANTS.ROUND_OVER;

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
 * @returns {Promise<string|null>} Verified battle state reported via the Test API after synchronization.
 */
async function manuallySyncBattleState(
  page,
  { fromState = null, finalState = STATE_CONSTANTS.ROUND_OVER, timeout = TIMEOUTS.STATE_SYNC } = {}
) {
  const syncResult = await page.evaluate(
    async ({ fromState: priorState, finalState: targetState }) => {
      const stateApi = window.__TEST_API?.state;
      if (!stateApi) {
        return {
          success: false,
          reason: "STATE_API_UNAVAILABLE",
          attempts: [],
          initialState: priorState ?? null,
          finalState: null
        };
      }

      const readState = () => {
        try {
          return typeof stateApi.getBattleState === "function"
            ? (stateApi.getBattleState() ?? null)
            : null;
        } catch {
          return null;
        }
      };

      const initialState = priorState ?? readState();
      const attempts = [];

      const eventCandidates = [];
      if (targetState === "roundOver") {
        // Use actual state machine outcome events instead of "roundResolved" battle event
        // The roundResolved event is emitted AFTER state transitions, not as a trigger
        eventCandidates.push("outcome=winPlayer", "outcome=winOpponent", "outcome=draw");
      }
      if (typeof targetState === "string" && targetState) {
        eventCandidates.push(targetState);
      }

      const dispatchers = [];

      const nowMs = () =>
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();

      if (typeof stateApi.dispatchBattleEvent === "function") {
        const dispatch = stateApi.dispatchBattleEvent.bind(stateApi);
        for (const eventName of eventCandidates) {
          dispatchers.push(async () => {
            try {
              const result = await dispatch(eventName, {
                __manualSync: true,
                from: initialState ?? null,
                to: targetState
              });
              const ok = result === true || result === targetState;
              attempts.push({
                strategy: "state.dispatchBattleEvent",
                eventName,
                ok,
                result: ok ? "resolved" : (result ?? null)
              });
              return ok;
            } catch (error) {
              attempts.push({
                strategy: "state.dispatchBattleEvent",
                eventName,
                ok: false,
                error: error instanceof Error ? error.message : String(error)
              });
              return false;
            }
          });
        }
      }

      const machine =
        typeof stateApi.getBattleStateMachine === "function"
          ? stateApi.getBattleStateMachine()
          : null;

      if (machine && typeof machine.dispatch === "function") {
        const machineDispatch = machine.dispatch.bind(machine);
        dispatchers.push(async () => {
          try {
            const result = await machineDispatch(targetState);
            const ok = result === true || result === targetState;
            attempts.push({
              strategy: "stateMachine.dispatch",
              eventName: targetState,
              ok,
              result: ok ? "resolved" : (result ?? null)
            });
            return ok;
          } catch (error) {
            attempts.push({
              strategy: "stateMachine.dispatch",
              eventName: targetState,
              ok: false,
              error: error instanceof Error ? error.message : String(error)
            });
            return false;
          }
        });
      }

      let success = initialState === targetState;
      const dispatchStart = nowMs();
      const dispatchBudgetMs = TIMEOUTS.STATE_DISPATCH_BUDGET;

      for (const attempt of dispatchers) {
        if (success) {
          break;
        }

        if (nowMs() - dispatchStart > dispatchBudgetMs) {
          attempts.push({
            strategy: "dispatch.sequence",
            eventName: null,
            ok: false,
            error: "TIMEBOX_EXCEEDED"
          });
          break;
        }

        success = (await attempt()) || success;
      }

      const finalState = readState();
      success = success || finalState === targetState;

      return {
        success,
        reason: success ? null : "STATE_NOT_REACHED",
        attempts,
        initialState,
        finalState
      };
    },
    { fromState, finalState }
  );

  const attemptSummary = Array.isArray(syncResult?.attempts)
    ? syncResult.attempts
        .map((attempt) => {
          const parts = [attempt.strategy, attempt.eventName].filter(Boolean);
          if (attempt.ok) {
            parts.push("✓");
          } else if (attempt.error) {
            const errorText = String(attempt.error);
            const truncated =
              errorText.length > 30 ? `${errorText.substring(0, 30)}...` : errorText;
            parts.push(`✗(${truncated})`);
          } else if (attempt.result) {
            parts.push(`→${attempt.result}`);
          }
          return parts.join(" ");
        })
        .join(", ")
    : "";

  const pollDetails = [];
  if (syncResult && !syncResult.success && syncResult.reason) {
    pollDetails.push(`Sync failed: ${syncResult.reason}`);
  }
  if (attemptSummary) {
    pollDetails.push(`Attempts: ${attemptSummary}`);
  }

  const pollMessageParts = [
    `Expected manual battle state sync to report "${finalState}" after fallback.`
  ];
  if (pollDetails.length) {
    pollMessageParts.push(pollDetails.join(" | "));
  }

  await expect
    .poll(async () => safeGetBattleState(page), {
      timeout,
      message: pollMessageParts.join(" ")
    })
    .toBe(finalState);

  const verifiedState = await safeGetBattleState(page, null);
  return typeof verifiedState === "string" && verifiedState ? verifiedState : null;
}

/**
 * @pseudocode
 * - extract player choice and opponent stat from battle store
 * - call roundResolver.resolveRound to execute full resolution pipeline
 * - this properly evaluates round, updates scores, increments roundsPlayed, emits events
 * - inspect latest battle state and determine if manual sync is required
 * - when needed, force DOM + state API alignment to "roundOver" and verify sync
 *
 * @param {import('@playwright/test').Page} page
 * @param {() => Promise<boolean>} hasResolved
 * @param {string | null | undefined} stateAfterCli
 * @returns {Promise<{ resolved: boolean, stateAfterTransition: string | null | undefined }>}
 */
async function triggerRoundResolvedFallback(page, hasResolved, stateAfterCli) {
  // Execute the actual resolution logic (not just dispatch event)
  // This calls resolveRound which increments roundsPlayed and emits events
  await executeRoundResolution(page);

  let stateAfterTransition = await safeGetBattleState(page, stateAfterCli);

  if (shouldForceRoundOver(stateAfterTransition)) {
    const previousState = stateAfterTransition ?? stateAfterCli ?? null;

    const syncedState = await manuallySyncBattleState(page, {
      fromState: previousState,
      finalState: STATE_CONSTANTS.ROUND_OVER,
      timeout: TIMEOUTS.STATE_SYNC
    });

    if (typeof syncedState === "string" && syncedState) {
      stateAfterTransition = syncedState;
    } else {
      stateAfterTransition = await safeGetBattleState(page, STATE_CONSTANTS.ROUND_OVER);
    }
  }

  const resolved = isRoundOverState(stateAfterTransition) ? true : await hasResolved();

  return { resolved, stateAfterTransition };
}

function shouldForceRoundOver(state) {
  if (isRoundOverState(state)) {
    return false;
  }

  return state === STATE_CONSTANTS.WAITING_FOR_PLAYER_ACTION || state === STATE_CONSTANTS.COOLDOWN;
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
    latestState === STATE_CONSTANTS.WAITING_FOR_PLAYER_ACTION ||
    (!isRoundOverState(latestState) && !(await hasResolved()))
  ) {
    await nextBtn.click();
  }
}

async function resolveRoundDeterministic(page) {
  const hasResolved = async () => {
    const state = await safeGetBattleState(page);
    if (isRoundOverState(state)) {
      return true;
    }

    if (typeof state !== "string" || !isMatchEndState(state)) {
      return false;
    }

    const diagnostics = await readBattleStateDiagnostics(page);
    if (!diagnostics || diagnostics.error) {
      return false;
    }

    const snapshot =
      diagnostics.snapshot && typeof diagnostics.snapshot === "object"
        ? diagnostics.snapshot
        : null;
    const log = Array.isArray(snapshot?.log) ? snapshot.log : [];
    const prev = typeof snapshot?.prev === "string" ? snapshot.prev : null;

    return matchFlowAdvancedBeyondRoundOver(state, log, prev);
  };

  const { resolved: resolvedViaCli, stateAfterCli } = await attemptCliResolution(page);
  let stateForFallback = stateAfterCli;
  if (resolvedViaCli) {
    const latestState = await safeGetBattleState(page, stateAfterCli);
    if (isMatchEndState(latestState)) {
      return;
    }
    stateForFallback = latestState;
  }

  const { resolved: resolvedAfterTransition, stateAfterTransition } =
    await triggerRoundResolvedFallback(page, hasResolved, stateForFallback);
  if (resolvedAfterTransition) {
    const finalResolutionCheck = await hasResolved();
    if (finalResolutionCheck) {
      return;
    }
  }

  await clickNextButtonFallback(page, {
    hasResolved,
    stateAfterCli: stateForFallback,
    stateAfterTransition
  });
}

function cooldownImmediatelyFollowsRoundOver(state, log, prev) {
  if (state !== STATE_CONSTANTS.COOLDOWN) {
    return false;
  }

  if (Array.isArray(log)) {
    for (let index = log.length - 1; index >= 0; index -= 1) {
      const entry = log[index];
      if (!entry || typeof entry !== "object") {
        continue;
      }
      if (entry.to === STATE_CONSTANTS.COOLDOWN) {
        if (entry.from === STATE_CONSTANTS.ROUND_OVER) {
          return true;
        }
        for (let prior = index - 1; prior >= 0; prior -= 1) {
          const previous = log[prior];
          if (!previous || typeof previous !== "object") {
            continue;
          }
          if (previous.to === STATE_CONSTANTS.ROUND_OVER) {
            return true;
          }
        }
        break;
      }
      if (entry.to === STATE_CONSTANTS.ROUND_OVER) {
        return true;
      }
    }
  }

  return prev === STATE_CONSTANTS.ROUND_OVER;
}

function matchFlowAdvancedBeyondRoundOver(state, log, prev) {
  if (!isMatchEndState(state)) {
    return false;
  }

  if (prev === STATE_CONSTANTS.ROUND_OVER) {
    return true;
  }

  if (!Array.isArray(log)) {
    return false;
  }

  let inMatchEndSequence = false;

  for (let index = log.length - 1; index >= 0; index -= 1) {
    const entry = log[index];
    if (!entry || typeof entry !== "object") {
      continue;
    }

    if (isMatchEndState(entry.to)) {
      inMatchEndSequence = true;
      if (entry.from === STATE_CONSTANTS.ROUND_OVER) {
        return true;
      }
      continue;
    }

    if (inMatchEndSequence && entry.to === STATE_CONSTANTS.ROUND_OVER) {
      return true;
    }
  }

  return false;
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
 * DETECT resolution when the state is "roundOver", when "cooldown" immediately follows, or when match-end states follow "roundOver".
 * THROW with diagnostic details if neither condition is observed before the timeout.
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {{ timeout?: number, message?: string }} [options] - Polling configuration
 * @returns {Promise<void>}
 */
export async function confirmRoundResolved(page, options = {}) {
  const {
    timeout = TIMEOUTS.ROUND_RESOLUTION_VERIFY,
    message = 'Expected battle state to reach "roundOver" (or progress into cooldown/match end) after deterministic resolution'
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
        const matchEndedAfterRoundOver =
          matchFlowAdvancedBeyondRoundOver(currentState, log, prev) ||
          (stateFromSnapshot
            ? matchFlowAdvancedBeyondRoundOver(stateFromSnapshot, log, prev)
            : false);

        return {
          resolved:
            isRoundOverState(currentState) || cooldownAfterRoundOver || matchEndedAfterRoundOver,
          state: currentState,
          cooldownAfterRoundOver,
          matchEndedAfterRoundOver,
          snapshotState: stateFromSnapshot,
          snapshotPrev: prev,
          lastLogEntry: log.length ? log[log.length - 1] : null
        };
      },
      { timeout, message }
    )
    .toMatchObject({ resolved: true });
}

/**
 * Ensures a round is resolved by attempting multiple resolution strategies.
 * @pseudocode
 * - If forceResolve is false, first attempt to wait for roundOver state naturally
 * - If natural resolution fails or forceResolve is true, execute deterministic resolution
 * - Call resolveRoundDeterministic to try CLI resolution and fallback strategies
 * - Verify resolution succeeded using confirmRoundResolved with timeout
 *
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {Object} [options] - Resolution configuration
 * @param {number} [options.deadline=1500] - Timeout for natural resolution attempt in ms
 * @param {number} [options.verifyTimeout=3000] - Timeout for resolution verification in ms
 * @param {boolean} [options.forceResolve=false] - Skip natural resolution and force deterministic
 * @returns {Promise<void>}
 */
export async function ensureRoundResolved(page, options = {}) {
  const {
    deadline = TIMEOUTS.RESOLUTION_DEADLINE,
    verifyTimeout = TIMEOUTS.ROUND_RESOLUTION_VERIFY,
    forceResolve = false
  } = options;

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
    featureFlags = { showRoundSelectModal: true, opponentDelayMessage: false }, // Disable delay in tests
    awaitStats = true
  } = config;

  await page.addInitScript(
    ({ timers, cooldown, delay, flags }) => {
      // Clear handler registration guard to ensure fresh state for each test
      // This prevents the WeakSet from blocking handler re-registration across test runs
      delete globalThis.__cbUIHelpersDynamicBoundTargets;

      // Also reset the EventTarget instance to ensure a completely clean state
      // Without this, the same EventTarget persists and the WeakSet sees it as "already registered"
      delete globalThis.__classicBattleEventTarget;

      window.__OVERRIDE_TIMERS = timers;
      if (typeof cooldown === "number") {
        window.__NEXT_ROUND_COOLDOWN_MS = cooldown;
      }
      if (typeof delay === "number") {
        window.__OPPONENT_RESOLVE_DELAY_MS = delay;
      }
      window.__FF_OVERRIDES = { showRoundSelectModal: true, ...flags };
      window.process = { env: { VITEST: "1" } };
      // Disable autoContinue for deterministic roundOver state observation
      window.__AUTO_CONTINUE = false;
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
  const { timeout = TIMEOUTS.ROUNDS_PLAYED_DEFAULT } = options;
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

export const __TEST_ONLY__ = {
  cooldownImmediatelyFollowsRoundOver
};
