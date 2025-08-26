import { evaluateRound as evaluateRoundApi } from "../api/battleUI.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { emitBattleEvent } from "./battleEvents.js";
import { resetStatButtons } from "../battle/battleUI.js";

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
    console.log("DEBUG: computeRoundResult start", { stat, playerVal, opponentVal });
  } catch {}
  // Coerce values to finite numbers to avoid NaN blocking outcome computation.
  const pVal = Number.isFinite(Number(playerVal)) ? Number(playerVal) : 0;
  const oVal = Number.isFinite(Number(opponentVal)) ? Number(opponentVal) : 0;
  const result = evaluateRound(store, stat, pVal, oVal);
  try {
    console.log("DEBUG: evaluateRound result", result);
  } catch {}
  const outcomeEvent =
    result.outcome === "winPlayer"
      ? "outcome=winPlayer"
      : result.outcome === "winOpponent"
        ? "outcome=winOpponent"
        : "outcome=draw";
  try {
    console.log("DEBUG: dispatching outcomeEvent", outcomeEvent);
  } catch {}
  await dispatchBattleEvent(outcomeEvent);
  try {
    console.log("DEBUG: dispatched outcomeEvent", outcomeEvent);
  } catch {}
  if (result.matchEnded) {
    await dispatchBattleEvent("matchPointReached");
  } else {
    await dispatchBattleEvent("continue");
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
    console.log("DEBUG: resolveRound sleep", { delayMs, stat });
  } catch {}
  // Clear any scheduled guard to avoid duplicate resolution.
  try {
    if (typeof window !== "undefined" && window.__roundDecisionGuard) {
      clearTimeout(window.__roundDecisionGuard);
      window.__roundDecisionGuard = null;
    }
    if (typeof window !== "undefined") window.__roundDebug = { resolving: true };
  } catch {}
  await sleep(delayMs);
  try {
    console.log("DEBUG: resolveRound before opponentReveal", { stat });
  } catch {}
  emitBattleEvent("opponentReveal");
  const result = await computeRoundResult(store, stat, playerVal, opponentVal);
  try {
    if (typeof window !== "undefined" && window.__roundDebug) {
      window.__roundDebug.resolvedAt = Date.now();
    }
  } catch {}
  try {
    console.log("DEBUG: resolveRound result", result);
  } catch {}
  return result;
}
