import { evaluateRound as evaluateRoundApi } from "../api/battleUI.js";
import { dispatchBattleEvent } from "./orchestrator.js";
import { emitBattleEvent } from "./battleEvents.js";
import { resetStatButtons } from "../battle/battleUI.js";
import { exposeDebugState, readDebugState } from "./debugHooks.js";

/**
 * Round resolution helpers and orchestrator for Classic Battle.
 *
 * @pseudocode
 * 1. `resolveRound` guards against concurrent execution via `isResolving`.
 * 2. `ensureRoundDecisionState` dispatches `evaluate` when needed.
 * 3. `delayAndRevealOpponent` waits before revealing the opponent's stat.
 * 4. `finalizeRoundResult` evaluates the round and clears any pending guards.
 */

const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;
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
 * Evaluate a selected stat and return the outcome data.
 * This function only evaluates and returns outcome data; it does not emit any events.
 * Event emission is handled elsewhere (e.g., in handleStatSelection).
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {{message: string, matchEnded: boolean, playerScore: number, opponentScore: number, outcome: string, playerVal: number, opponentVal: number}}
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function evaluateRound(store, stat, playerVal, opponentVal) {
  return evaluateRoundData(playerVal, opponentVal);
}

/**
 * Compute the round result and emit outcome events.
 *
 * @pseudocode
 * 1. Call `evaluateRound` to obtain the round outcome.
 * 2. Dispatch an outcome event based on the result.
 * 3. Dispatch `matchPointReached` or `continue` depending on `matchEnded`.
 * 4. Emit `roundResolved` with round data and clear `store.playerChoice`.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {number} playerVal - Player's stat value.
 * @param {number} opponentVal - Opponent's stat value.
 * @returns {Promise<ReturnType<typeof evaluateRound>>}
 */
export async function computeRoundResult(store, stat, playerVal, opponentVal) {
  try {
    if (!IS_VITEST)
      console.log("DEBUG: computeRoundResult start", { stat, playerVal, opponentVal });
  } catch {}
  // Coerce values to finite numbers to avoid NaN blocking outcome computation.
  const pVal = Number.isFinite(Number(playerVal)) ? Number(playerVal) : 0;
  const oVal = Number.isFinite(Number(opponentVal)) ? Number(opponentVal) : 0;
  const result = evaluateRound(store, stat, pVal, oVal);
  try {
    if (!IS_VITEST) console.log("DEBUG: evaluateRound result", result);
  } catch {}
  const outcomeEvent =
    result.outcome === "winPlayer"
      ? "outcome=winPlayer"
      : result.outcome === "winOpponent"
        ? "outcome=winOpponent"
        : "outcome=draw";
  // Fire-and-forget dispatch to avoid re-entrancy deadlocks when called from
  // within a state's onEnter handler. Schedule via microtask and macrotask so
  // transitions run after onEnter completes.
  try {
    if (!IS_VITEST) console.log("DEBUG: Dispatching outcomeEvent:", outcomeEvent);
    await dispatchBattleEvent(outcomeEvent);
    if (result.matchEnded) {
      await dispatchBattleEvent("matchPointReached");
    } else {
      await dispatchBattleEvent("continue");
    }
  } catch (error) {
    if (!IS_VITEST) console.error("DEBUG: Error dispatching outcome events:", error);
  }
  resetStatButtons();
  // Proactively update the scoreboard with the resolved scores so tests and
  // runtime reflect the new totals immediately, even if downstream handlers
  // are mocked or not yet bound.
  try {
    const sb = await import("../setupScoreboard.js");
    if (typeof sb.updateScore === "function") {
      sb.updateScore(result.playerScore, result.opponentScore);
    }
  } catch {}
  emitBattleEvent("roundResolved", {
    store,
    stat,
    playerVal,
    opponentVal,
    result
  });
  store.playerChoice = null;
  return result;
}

/**
 * Ensure the state machine is ready to evaluate the round.
 *
 * @pseudocode
 * 1. Check if `document.body.dataset.battleState` is `"roundDecision"`.
 * 2. If not, dispatch the `"evaluate"` event.
 * 3. Swallow any errors from dispatching.
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
  try {
    if (!IS_VITEST) console.log("DEBUG: resolveRound sleep", { delayMs, stat });
  } catch {}
  try {
    exposeDebugState("roundDebug", { resolving: true });
  } catch {}
  await sleep(delayMs);
  try {
    if (!IS_VITEST) console.log("DEBUG: resolveRound before opponentReveal", { stat });
  } catch {}
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
export async function finalizeRoundResult(store, stat, playerVal, opponentVal) {
  const result = await computeRoundResult(store, stat, playerVal, opponentVal);
  try {
    const fn = readDebugState("roundDecisionGuard");
    if (typeof fn === "function") fn();
    exposeDebugState("roundDecisionGuard", null);
  } catch {}
  try {
    const rd = readDebugState("roundDebug");
    if (rd) rd.resolvedAt = Date.now();
  } catch {}
  try {
    if (!IS_VITEST) console.log("DEBUG: resolveRound result", result);
  } catch {}
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
export async function resolveRound(
  store,
  stat,
  playerVal,
  opponentVal,
  {
    delayMs = 300 + Math.floor(Math.random() * 401),
    sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  } = {}
) {
  if (isResolving) return;
  isResolving = true;
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
