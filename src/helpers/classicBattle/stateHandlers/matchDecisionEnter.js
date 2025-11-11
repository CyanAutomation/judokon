import { emitBattleEvent } from "../battleEvents.js";
import { showEndModal } from "../endModal.js";
import {
  getScores as getFacadeScores,
  isMatchEnded as facadeIsMatchEnded
} from "../../battleEngineFacade.js";

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
 * Read the latest match scores from the engine or facade helpers.
 * Falls back gracefully if either source is unavailable or throws.
 *
 * @param {any} engine
 * @returns {{ player: number, opponent: number }}
 */
function readScores(engine) {
  let raw = null;
  try {
    if (engine && typeof engine.getScores === "function") {
      raw = engine.getScores();
    }
  } catch (error) {
    if (typeof Sentry !== "undefined" && Sentry?.captureException) {
      Sentry.captureException(new Error("matchDecisionEnter: engine.getScores() threw"), {
        contexts: { error: { original: error.message } }
      });
    }
  }
  if (!raw) {
    try {
      raw = getFacadeScores();
    } catch (error) {
      if (typeof Sentry !== "undefined" && Sentry?.captureException) {
        Sentry.captureException(new Error("matchDecisionEnter: getFacadeScores() threw"), {
          contexts: { error: { original: error.message } }
        });
      }
    }
  }
  return {
    player: coerceScore(raw?.playerScore ?? raw?.player),
    opponent: coerceScore(raw?.opponentScore ?? raw?.opponent)
  };
}

/**
 * Determine whether the match has definitively ended.
 * Checks store, engine, and facade helpers in priority order.
 *
 * @param {any} store
 * @param {any} engine
 * @returns {boolean}
 */
function isMatchComplete(store, engine) {
  if (store?.matchEnded === true) return true;
  try {
    if (engine && typeof engine.isMatchEnded === "function" && engine.isMatchEnded()) {
      return true;
    }
  } catch (error) {
    if (typeof Sentry !== "undefined" && Sentry?.captureException) {
      Sentry.captureException(new Error("matchDecisionEnter: engine.isMatchEnded() threw"), {
        contexts: { error: { original: error.message } }
      });
    }
  }
  try {
    if (typeof facadeIsMatchEnded === "function" && facadeIsMatchEnded()) return true;
  } catch (error) {
    if (typeof Sentry !== "undefined" && Sentry?.captureException) {
      Sentry.captureException(new Error("matchDecisionEnter: facadeIsMatchEnded() threw"), {
        contexts: { error: { original: error.message } }
      });
    }
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
 * @param {any} store
 * @param {{ player: number, opponent: number }} scores
 * @returns {string}
 */
function resolveOutcome(store, scores) {
  const lastOutcome =
    typeof store?.lastRoundResult?.outcome === "string" ? store.lastRoundResult.outcome : "";
  if (lastOutcome) {
    if (lastOutcome === "winPlayer") return "matchWinPlayer";
    if (lastOutcome === "winOpponent") return "matchWinOpponent";
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
    try {
      emitBattleEvent("matchDecision", { matchEnded: false, scores });
    } catch (error) {
      if (typeof Sentry !== "undefined" && Sentry?.captureException) {
        Sentry.captureException(error);
      }
    }
    return;
  }

  const outcome = resolveOutcome(store, scores);
  const message =
    typeof store?.lastRoundResult?.message === "string" ? store.lastRoundResult.message : undefined;
  const detail = {
    outcome,
    winner: getWinner(outcome),
    scores,
    ...(message ? { message } : {})
  };

  // Emit the matchDecision event with final outcome
  try {
    emitBattleEvent("matchDecision", detail);
  } catch (error) {
    if (typeof Sentry !== "undefined" && Sentry?.captureException) {
      Sentry.captureException(error);
    }
  }

  // Persist outcome to store for later reference (if store is mutable)
  if (store && typeof store === "object") {
    try {
      store.matchOutcome = detail;
    } catch (error) {
      if (typeof Sentry !== "undefined" && Sentry?.captureException) {
        Sentry.captureException(new Error("matchDecisionEnter: unable to set store.matchOutcome"), {
          contexts: { error: { original: error.message } }
        });
      }
    }
  }

  // Display the end-of-match modal with Replay and Quit options
  if (store) {
    try {
      showEndModal(store, detail);
    } catch (error) {
      if (typeof Sentry !== "undefined" && Sentry?.captureException) {
        Sentry.captureException(error);
      }
    }
  }
}

export default matchDecisionEnter;
