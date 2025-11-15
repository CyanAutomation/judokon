import * as Sentry from "@sentry/browser";
import { emitBattleEvent } from "../battleEvents.js";
import { showEndModal } from "../endModal.js";
import {
  getScores as getFacadeScores,
  isMatchEnded as facadeIsMatchEnded
} from "../../battleEngineFacade.js";

/**
 * Safely capture errors to Sentry with context.
 * @param {Error} error
 * @param {Object} context
 */
function captureError(error, context = {}) {
  try {
    if (Sentry?.captureException) {
      Sentry.captureException(error, { contexts: { error: context } });
    }
  } catch {
    // Silent fallback if Sentry fails
  }
}

/**
 * Execute a function safely, capturing any errors to Sentry.
 * @param {Function} fn
 * @param {string} errorLabel
 * @returns {any}
 */
function safeTry(fn, errorLabel) {
  try {
    return fn();
  } catch (error) {
    captureError(new Error(`matchDecisionEnter: ${errorLabel}`), {
      original: error.message
    });
    return null;
  }
}

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
 * Map round outcome tokens to match outcome tokens.
 * @type {Object<string, string>}
 */
const OUTCOME_MAP = {
  winPlayer: "matchWinPlayer",
  winOpponent: "matchWinOpponent"
};

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
 * Read the latest match scores from the engine or facade helpers.
 * Tries engine.getScores() first, then falls back to getFacadeScores().
 * Returns normalized scores with graceful degradation on error.
 *
 * @param {Object} engine - Battle engine (may have getScores())
 * @returns {{ player: number, opponent: number }}
 */
function readScores(engine) {
  const raw =
    safeTry(() => engine?.getScores?.(), "engine.getScores() threw") ||
    safeTry(() => getFacadeScores(), "getFacadeScores() threw");

  return {
    player: coerceScore(raw?.playerScore ?? raw?.player),
    opponent: coerceScore(raw?.opponentScore ?? raw?.opponent)
  };
}

/**
 * Determine whether the match has definitively ended.
 * Checks store, engine, and facade helpers in priority order.
 *
 * @param {Object} store - Battle store (may contain matchEnded flag)
 * @param {Object} engine - Battle engine (may have isMatchEnded())
 * @returns {boolean}
 */
function isMatchComplete(store, engine) {
  if (store?.matchEnded === true) return true;

  if (safeTry(() => engine?.isMatchEnded?.(), "engine.isMatchEnded() threw")) {
    return true;
  }

  if (safeTry(() => facadeIsMatchEnded(), "facadeIsMatchEnded() threw")) {
    return true;
  }

  return false;
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
    return OUTCOME_MAP[lastOutcome] || lastOutcome;
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
 * 1. Resolve final scores from the active engine (fallback to facade helpers).
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
  if (!isMatchComplete(store, engine)) {
    safeTry(
      () => emitBattleEvent("matchDecision", { matchEnded: false, scores }),
      "emitBattleEvent threw"
    );
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
  safeTry(() => emitBattleEvent("matchDecision", detail), "emitBattleEvent threw");

  // Persist outcome to store for later reference (if store is mutable)
  if (store && typeof store === "object") {
    safeTry(() => {
      store.matchOutcome = detail;
    }, "unable to set store.matchOutcome");
  }

  // Display the end-of-match modal with Replay and Quit options
  if (store) {
    safeTry(() => showEndModal(store, detail), "showEndModal threw");
  }
}

export default matchDecisionEnter;
