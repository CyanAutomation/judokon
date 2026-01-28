import { emitBattleEvent } from "../battleEvents.js";
import { showEndModal } from "../endModal.js";

/**
 * Normalize numeric score values.
 *
 * @param {unknown} value
 * @returns {number}
 */
function coerceScore(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/**
 * Map match outcome token to winner identifier.
 *
 * @param {string} outcome
 * @returns {'player'|'opponent'|'none'}
 */
function getWinner(outcome) {
  if (outcome === "matchWinPlayer") return "player";
  if (outcome === "matchWinOpponent") return "opponent";
  return "none";
}

/**
 * Read the latest match scores from the engine.
 * Returns normalized scores with graceful degradation when values are missing.
 *
 * @param {Object} engine - Battle engine (may have getScores())
 * @returns {{ player: number, opponent: number }}
 */
function readScores(engine) {
  const raw = engine?.getScores?.() ?? null;

  return {
    player: coerceScore(raw?.playerScore ?? raw?.player),
    opponent: coerceScore(raw?.opponentScore ?? raw?.opponent)
  };
}

/**
 * Determine whether the match has definitively ended.
 * Uses the battle engine as the source of truth.
 *
 * @param {Object} engine - Battle engine (may have isMatchEnded())
 * @returns {boolean}
 */
function isMatchComplete(engine) {
  try {
    return Boolean(engine?.isMatchEnded?.());
  } catch {
    return false;
  }
}

/**
 * Resolve the canonical match outcome token based on stored result or score comparison.
 *
 * Priority:
 * 1. Use stored `lastRoundResult.outcome` if present (may represent quit, draw, or win).
 * 2. Fall back to score comparison: player > opponent → "matchWinPlayer", etc.
 * 3. Default to "matchDraw" if no score difference.
 *
 * @param {Object} store - Battle store (may contain lastRoundResult)
 * @param {{ player: number, opponent: number }} scores
 * @returns {string}
 */
function resolveOutcome(store, scores) {
  const lastOutcome = store?.lastRoundResult?.outcome;

  if (typeof lastOutcome === "string") {
    return lastOutcome;
  }

  if (scores.player > scores.opponent) return "matchWinPlayer";
  if (scores.opponent > scores.player) return "matchWinOpponent";
  return "matchDraw";
}

/**
 * onEnter handler for `matchDecision` state.
 *
 * @param {import("../stateManager.js").ClassicBattleStateManager} machine
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Resolve final scores from the active engine.
 * 2. Ensure the match has ended; emit event and surface the end-of-match modal.
 * 3. Derive the outcome token using the stored round result or score comparison.
 * 4. Build match detail object with outcome, winner, scores, and optional message.
 * 5. Emit `matchDecision` event and persist outcome to store (if mutable).
 * 6. Display the end-of-match modal (Replay/Quit actions).
 */
export async function matchDecisionEnter(machine) {
  const store = machine?.context?.store ?? null;
  const engine = machine?.context?.engine ?? null;

  const scores = readScores(engine);

  // Ensure match is complete before proceeding; if not, log and return early
  if (!isMatchComplete(engine)) {
    try {
      emitBattleEvent("matchDecision", { matchEnded: false, scores });
    } catch (error) {
      console.error("Failed to emit matchDecision event:", error);
    }
    return;
  }

  const outcome = resolveOutcome(store, scores);
  const message =
    typeof store?.lastRoundResult?.message === "string" ? store.lastRoundResult.message : undefined;

  const detail = {
    outcome,
    winner: getWinner(outcome),
    scores
  };

  if (message) {
    detail.message = message;
  }

  // Emit the matchDecision event with final outcome
  try {
    emitBattleEvent("matchDecision", detail);
  } catch (error) {
    console.error("Failed to emit matchDecision event:", error);
  }

  // Persist outcome to store for later reference (if store is mutable)
  if (store && typeof store === "object") {
    store.matchOutcome = detail;
  }

  // Display the end-of-match modal with Replay and Quit options
  if (store) {
    try {
      showEndModal(store, detail);
    } catch (error) {
      console.error("Failed to show end modal:", error);
    }
  }
}

export default matchDecisionEnter;
