import { evaluateRound as evaluateRoundApi, getOutcomeMessage } from "../api/battleUI.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { emitBattleEvent } from "./battleEvents.js";
import * as engineFacade from "../battleEngineFacade.js";
import { isEnabled } from "../featureFlags.js";
import { exposeDebugState, readDebugState } from "./debugHooks.js";
import { debugLog } from "../debug.js";
import { resolveDelay } from "./timerUtils.js";
import * as sb from "../setupScoreboard.js";
import { writeScoreDisplay } from "./scoreDisplay.js";
import { cancelRoundDecisionGuard } from "./stateHandlers/guardCancellation.js";

/**
 * Round resolution helpers and orchestrator for Classic Battle.
 *
 * @pseudocode
 * 1. `resolveRound` guards against concurrent execution via `isResolving`.
 * 2. `ensureRoundDecisionState` dispatches `evaluate` when needed.
 * 3. `delayAndRevealOpponent` waits before revealing the opponent's stat.
 * 4. `finalizeRoundResult` evaluates the round and clears any pending guards.
 */

// Guard to prevent concurrent resolution attempts. Module-scoped so multiple
// callers share the same guard in test environments where modules are not
// re-instantiated between tests.
let isResolving = false;

/**
 * Evaluate round data without side effects.
 *
 * @pseudocode
 * 1. Call `evaluateRoundApi` with the provided values.
 * 2. Return the API result augmented with the input values.
 *
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {{message: string, matchEnded: boolean, playerScore: number, opponentScore: number, outcome: string, delta: number, playerVal: number, opponentVal: number}}
 */
export function evaluateRoundData(playerVal, opponentVal) {
  const base = evaluateRoundApi(playerVal, opponentVal);
  return { ...base, playerVal, opponentVal };
}

/**
 * @summary Evaluate a selected stat and return the round outcome data without side effects.
 * @pseudocode
 * 1. Delegate to `evaluateRoundData` with the provided player and opponent values.
 * 2. Return the normalized evaluation result for downstream processing.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store (unused by the pure evaluation).
 * @param {string} stat - Selected stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {{message: string, matchEnded: boolean, playerScore: number, opponentScore: number, outcome: string, playerVal: number, opponentVal: number}}
 */
export function evaluateRound(store, stat, playerVal, opponentVal) {
  return evaluateRoundData(playerVal, opponentVal);
}

function resolveStatsSnapshot(store) {
  if (!store || typeof store !== "object") return undefined;

  const candidate = store.currentPlayerJudoka?.stats || store.lastPlayerStats;
  return candidate && typeof candidate === "object" && !Array.isArray(candidate)
    ? { ...candidate }
    : undefined;
}

/**
 * Normalize inputs and evaluate the round.
 *
 * @pseudocode
 * 1. Coerce `playerVal` and `opponentVal` to finite numbers.
 * 2. Call `evaluateRound` with normalized values.
 * 3. Return the evaluation result.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player stat value.
 * @param {number} opponentVal - Opponent stat value.
 * @returns {ReturnType<typeof evaluateRound>}
 */
export function evaluateOutcome(store, stat, playerVal, opponentVal) {
  debugLog("DEBUG: evaluateOutcome start", { stat, playerVal, opponentVal });
  console.log("[DIAGNOSTIC] evaluateOutcome called with", { stat, playerVal, opponentVal });
  const pVal = Number.isFinite(Number(playerVal)) ? Number(playerVal) : 0;
  const oVal = Number.isFinite(Number(opponentVal)) ? Number(opponentVal) : 0;
  const statsSnapshot = resolveStatsSnapshot(store);

  try {
    console.log("[DIAGNOSTIC] evaluateOutcome: calling engineFacade.handleStatSelection");
    const result = engineFacade.handleStatSelection(pVal, oVal, statsSnapshot);
    debugLog("DEBUG: evaluateOutcome result", result);
    console.log("[DIAGNOSTIC] evaluateOutcome: handleStatSelection returned", result);

    // Add message generation for tests and real usage
    const message = getOutcomeMessage(result.outcome);
    const resultWithMessage = { ...result, message };

    return resultWithMessage;
  } catch (error) {
    // Fallback when engine is not initialized
    debugLog("DEBUG: evaluateOutcome fallback due to error", error);
    console.error("[DIAGNOSTIC] evaluateOutcome error:", error?.message);
    return evaluateRoundData(pVal, oVal);
  }
}

/**
 * Dispatch battle events reflecting the round outcome.
 *
 * @pseudocode
 * 1. Map `result.outcome` to an outcome event string.
 * 2. Dispatch the outcome event.
 * 3. Dispatch `matchPointReached` when the match ends; otherwise `continue`.
 * 4. Return the original result.
 *
 * @param {ReturnType<typeof evaluateRound>} result - Round evaluation result.
 * @returns {Promise<ReturnType<typeof evaluateRound>>}
 */
/**
 * Dispatch outcome events based on round result.
 *
 * @pseudocode
 * 1. Determine outcome event type based on result (winPlayer, winOpponent, or draw).
 * 2. Dispatch the appropriate outcome event to the battle machine.
 * 3. If match ended, dispatch matchPointReached event.
 * 4. Otherwise, dispatch continue event for next round.
 * 5. Return the original result.
 *
 * @param {ReturnType<typeof evaluateRound>} result - Round evaluation result
 * @returns {Promise<ReturnType<typeof evaluateRound>>} The original result
 */
export async function dispatchOutcomeEvents(result) {
  const outcomeEvent =
    result.outcome === "winPlayer" || result.outcome === "matchWinPlayer"
      ? "outcome=winPlayer"
      : result.outcome === "winOpponent" || result.outcome === "matchWinOpponent"
        ? "outcome=winOpponent"
        : "outcome=draw";
  try {
    debugLog("DEBUG: Dispatching outcomeEvent:", outcomeEvent);
    await dispatchBattleEvent(outcomeEvent);
    if (result.matchEnded) {
      await dispatchBattleEvent("matchPointReached");
    } else {
      await dispatchBattleEvent("continue");
    }
  } catch (error) {
    debugLog("DEBUG: Error dispatching outcome events:", error);
  }
  return result;
}

/**
 * @summary Update the scoreboard UI to reflect the latest round result.
 * @pseudocode
 * 1. Log debug info when running under Vitest.
 * 2. Invoke `sb.updateScore` when available to update any bound adapters.
 * 3. Update the DOM scoreboard directly to guarantee deterministic visuals.
 * 4. Return the original `result` for chaining convenience.
 *
 * @param {ReturnType<typeof evaluateRound>} result - Round evaluation result to persist.
 * @returns {Promise<ReturnType<typeof evaluateRound>>} Resolves with the original result.
 */
export async function updateScoreboard(result) {
  if (typeof sb.updateScore === "function") {
    sb.updateScore(result.playerScore, result.opponentScore);
  }
  // Update the DOM directly to keep E2E deterministic when adapters or bindings are not yet active
  try {
    const scoreEl = document.querySelector("header #score-display");
    if (scoreEl) {
      writeScoreDisplay(Number(result.playerScore) || 0, Number(result.opponentScore) || 0);
    }
  } catch {}

  return result;
}

/**
 * Emit round resolution events with detailed result data.
 *
 * @param {object} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @param {object} result - Round evaluation result.
 * @summary Emit round resolution events for UI updates and debugging.
 * @pseudocode
 * 1. Emit roundResolved event with complete round data.
 * 2. Emit round.evaluated event with normalized data structure.
 * 3. Emit display.score.update event for scoreboard synchronization.
 * 4. Update DOM directly for test environments.
 *
 * @returns {void}
 */
export function emitRoundResolved(store, stat, playerVal, opponentVal, result) {
  emitBattleEvent("roundResolved", { store, stat, playerVal, opponentVal, result });
  try {
    emitBattleEvent("round.evaluated", {
      statKey: stat,
      playerVal,
      opponentVal,
      outcome: result?.outcome,
      scores: {
        player: Number(result?.playerScore) || 0,
        opponent: Number(result?.opponentScore) || 0
      }
    });
  } catch {}
  // Also emit a PRD display score update so any scoreboard adapters reliably
  // receive the latest scores regardless of how the resolution was driven
  // (orchestrator vs direct resolution). This makes tests less brittle and
  // ensures the scoreboard UI stays in sync.
  try {
    const player = Number(result?.playerScore) || 0;
    const opponent = Number(result?.opponentScore) || 0;
    emitBattleEvent("display.score.update", { player, opponent });
  } catch {}

  // Update DOM directly to ensure round messages display properly
  try {
    const messageEl = document.querySelector("header #round-message");
    if (messageEl && result?.message) {
      messageEl.textContent = result.message;
    }
  } catch {}

  if (store && typeof store === "object") {
    store.playerChoice = null;
    store.lastRoundResult = result;
    store.matchEnded = Boolean(result?.matchEnded);
  }
  return result;
}

/**
 * @summary Execute the full round resolution pipeline from evaluation to UI reset.
 * @pseudocode
 * 1. Evaluate the round outcome using the selected stat values.
 * 2. Dispatch outcome events so dependent systems can react.
 * 3. Update the scoreboard with the new scores.
 * 4. Emit round resolved events for external observers.
 * 5. Wait for UI lock timers to settle to avoid race conditions.
 * 6. Return the final round result object (stat button reset deferred to next round start).
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {Promise<ReturnType<typeof evaluateRound>>}
 */
export async function computeRoundResult(store, stat, playerVal, opponentVal) {
  const evaluated = evaluateOutcome(store, stat, playerVal, opponentVal);
  const dispatched = await dispatchOutcomeEvents(evaluated);
  const scored = await updateScoreboard(dispatched);
  const emitted = emitRoundResolved(store, stat, playerVal, opponentVal, scored);
  await waitForRoundUILocks();
  // Stat buttons will be reset by applyRoundUI when the next round starts
  // Do NOT reset them here during cooldown as it bypasses guard logic
  return emitted;
}

function usingFakeTimers() {
  try {
    if (typeof globalThis?.vi?.isFakeTimers === "function") {
      return globalThis.vi.isFakeTimers();
    }
    const timeout = globalThis?.setTimeout;
    return Boolean(timeout && typeof timeout === "function" && typeof timeout?.clock === "object");
  } catch {
    return false;
  }
}

async function waitForRoundUILocks() {
  if (usingFakeTimers()) {
    const vi = globalThis?.vi;
    if (typeof vi?.runAllTimersAsync === "function") {
      try {
        await vi.runAllTimersAsync();
      } catch {}
    }
    return;
  }
  const setTimeoutFn = globalThis?.setTimeout;
  if (typeof setTimeoutFn !== "function") {
    return;
  }
  const delay = isEnabled("enableTestMode") ? 0 : 50;
  await new Promise((resolve) => {
    try {
      setTimeoutFn(resolve, delay);
    } catch {
      resolve();
    }
  });
}

/**
 * @summary Ensure the battle state machine is ready to evaluate the round.
 * @pseudocode
 * 1. Check if `document.body.dataset.battleState` equals `"roundDecision"`.
 * 2. Dispatch an `"evaluate"` event when the state differs.
 * 3. Swallow dispatch errors to avoid interrupting resolution flow.
 *
 * @returns {Promise<void>}
 */
export async function ensureRoundDecisionState() {
  try {
    const inRoundDecision =
      typeof document !== "undefined" && document.body?.dataset.battleState === "roundDecision";
    if (!inRoundDecision) {
      await dispatchBattleEvent("evaluate");
    }
  } catch {}
}

/**
 * Wait for a delay then reveal the opponent's stat.
 *
 * @pseudocode
 * 1. Mark `roundDebug.resolving` via `exposeDebugState`.
 * 2. Sleep for `delayMs` using the provided `sleep` function.
 * 3. Emit `"opponentReveal"`.
 *
 * @param {number} delayMs - Delay before revealing.
 * @param {(ms: number) => Promise<void>} sleep - Sleep implementation.
 * @param {string} stat - Chosen stat key (for debug logging).
 * @returns {Promise<void>}
 */
export async function delayAndRevealOpponent(delayMs, sleep, stat) {
  debugLog("DEBUG: resolveRound sleep", { delayMs, stat });
  exposeDebugState("roundDebug", { resolving: true });
  await sleep(delayMs);
  debugLog("DEBUG: resolveRound before opponentReveal", { stat });
  emitBattleEvent("opponentReveal");
}

/**
 * Finalize round resolution after the opponent is revealed.
 *
 * @pseudocode
 * 1. Call `computeRoundResult`.
 * 2. Invoke guard cancel function from `readDebugState('roundDecisionGuard')` when present.
 * 3. Stamp `readDebugState('roundDebug').resolvedAt`.
 * 4. Return the computation result.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {Promise<ReturnType<typeof evaluateRound>>}
 */
/**
 * Finalize round result with cleanup and debug state updates.
 *
 * @param {object} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {Promise<object>} Final round result after cleanup.
 * @summary Complete round resolution with guard cleanup and debug updates.
 * @pseudocode
 * 1. Compute the round result using evaluation pipeline.
 * 2. Clear any pending round decision guards.
 * 3. Update debug state with resolution timestamp.
 * 4. Log debug information about the result.
 * 5. Return the final result.
 */
export async function finalizeRoundResult(store, stat, playerVal, opponentVal) {
  const result = await computeRoundResult(store, stat, playerVal, opponentVal);
  cancelRoundDecisionGuard();
  try {
    const rd = readDebugState("roundDebug");
    if (rd) rd.resolvedAt = Date.now();
  } catch {}
  debugLog("DEBUG: resolveRound result", result);
  return result;
}

/**
 * Resolves the round after a stat has been selected.
 *
 * @pseudocode
 * 1. If no stat is provided, return immediately.
 * 2. Call `ensureRoundDecisionState`.
 * 3. Await `delayAndRevealOpponent`.
 * 4. Call `finalizeRoundResult` and return its value.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @param {{delayMs?: number, sleep?: (ms: number) => Promise<void>}} [opts]
 * - Optional overrides for testing.
 * @returns {Promise<ReturnType<typeof evaluateRound>>}
 */
/**
 * Resolve a battle round with stat comparison and outcome determination.
 *
 * @param {object} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @param {object} [opts={}] - Optional configuration overrides.
 * @param {number} [opts.delayMs] - Custom delay before revealing opponent stat.
 * @param {Function} [opts.sleep] - Custom sleep function for testing.
 * @returns {Promise<object>} Round resolution result.
 * @summary Main round resolution entry point with validation, timing, and cleanup.
 * @pseudocode
 * 1. Prevent concurrent resolution attempts using isResolving flag.
 * 2. Determine if running in headless mode for timing adjustments.
 * 3. Extract timing configuration with defaults.
 * 4. Validate that a stat was provided.
 * 5. Ensure round decision state is properly initialized.
 * 6. Apply delay and reveal opponent stat with animation.
 * 7. Finalize the round result with cleanup and debug updates.
 * 8. Reset the isResolving flag in finally block.
 * 9. Return the complete resolution result.
 */
export async function resolveRound(store, stat, playerVal, opponentVal, opts = {}) {
  if (isResolving) return;
  isResolving = true;
  const {
    // Deterministic delay using seeded RNG when available
    delayMs = resolveDelay(),
    sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  } = opts;
  try {
    if (!stat) return;
    await ensureRoundDecisionState();
    await delayAndRevealOpponent(delayMs, sleep, stat);
    const result = await finalizeRoundResult(store, stat, playerVal, opponentVal);
    return result;
  } finally {
    isResolving = false;
  }
}
