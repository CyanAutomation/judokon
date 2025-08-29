import { evaluateRound as evaluateRoundApi } from "../api/battleUI.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { emitBattleEvent } from "./battleEvents.js";
import { resetStatButtons } from "../battle/battleUI.js";

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
 * Resolves the round after a stat has been selected.
 *
 * @pseudocode
 * 1. If no stat is provided, return immediately.
 * 2. Dispatch an "evaluate" event unless already in the "roundDecision" state.
 * 3. Wait for a randomized delay.
 * 4. Emit "opponentReveal".
 * 5. Evaluate the round via `computeRoundResult` which also emits outcome events.
 * 6. Return the evaluation result.
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
    // Avoid re-entrant dispatch loops: when called from the state machine's
    // roundDecision onEnter, the machine is already in "roundDecision" and will
    // run this resolver. Dispatching an additional "evaluate" event here would
    // attempt to re-enter the same state and invoke this function again, causing
    // a deadlock. Only dispatch "evaluate" when not already in that state.
    try {
      const inRoundDecision =
        typeof document !== "undefined" && document.body?.dataset.battleState === "roundDecision";
      if (!inRoundDecision) {
        await dispatchBattleEvent("evaluate");
      }
    } catch {}
    try {
      if (!IS_VITEST) console.log("DEBUG: resolveRound sleep", { delayMs, stat });
    } catch {}
    // Mark resolving but keep the guard active until resolution completes; this
    // allows the guard to rescue the round if resolution stalls.
    try {
      if (typeof window !== "undefined") window.__roundDebug = { resolving: true };
    } catch {}
    await sleep(delayMs);
    try {
      if (!IS_VITEST) console.log("DEBUG: resolveRound before opponentReveal", { stat });
    } catch {}
    emitBattleEvent("opponentReveal");
    const result = await computeRoundResult(store, stat, playerVal, opponentVal);
    // Resolution completed; clear any scheduled guard to avoid late duplicate
    // outcome dispatch after we've already advanced the machine.
    try {
      if (typeof window !== "undefined" && window.__roundDecisionGuard) {
        clearTimeout(window.__roundDecisionGuard);
        window.__roundDecisionGuard = null;
      }
    } catch {}
    try {
      if (typeof window !== "undefined" && window.__roundDebug) {
        window.__roundDebug.resolvedAt = Date.now();
      }
    } catch {}
    try {
      if (!IS_VITEST) console.log("DEBUG: resolveRound result", result);
    } catch {}
    return result;
  } finally {
    isResolving = false;
  }
}
