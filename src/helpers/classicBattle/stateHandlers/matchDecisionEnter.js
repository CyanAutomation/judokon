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
 * Read the latest match scores from the engine or facade helpers.
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
  } catch {}
  if (!raw) {
    try {
      raw = getFacadeScores();
    } catch {}
  }
  return {
    player: coerceScore(raw?.playerScore ?? raw?.player),
    opponent: coerceScore(raw?.opponentScore ?? raw?.opponent)
  };
}

/**
 * Determine whether the match has definitively ended.
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
  } catch {}
  try {
    if (typeof facadeIsMatchEnded === "function" && facadeIsMatchEnded()) return true;
  } catch {}
  return false;
}

/**
 * Resolve the canonical match outcome token.
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
 * 2. Skip early when the match has not ended to avoid duplicate modal work.
 * 3. Derive the outcome token using the stored round result or score comparison.
 * 4. Emit a `matchDecision` event and surface the legacy end-of-match modal.
 */
export async function matchDecisionEnter(machine) {
  const store = machine?.context?.store ?? null;
  const engine = machine?.context?.engine ?? null;

  const scores = readScores(engine);
  if (!isMatchComplete(store, engine)) {
    try {
      emitBattleEvent("matchDecision", { matchEnded: false, scores });
    } catch {}
    return;
  }

  const outcome = resolveOutcome(store, scores);
  const message =
    typeof store?.lastRoundResult?.message === "string" ? store.lastRoundResult.message : undefined;
  const detail = {
    outcome,
    winner:
      outcome === "matchWinPlayer"
        ? "player"
        : outcome === "matchWinOpponent"
          ? "opponent"
          : "none",
    scores,
    ...(message ? { message } : {})
  };

  try {
    emitBattleEvent("matchDecision", detail);
  } catch {}

  if (store && typeof store === "object") {
    try {
      store.matchOutcome = detail;
    } catch {}
  }

  if (store) {
    showEndModal(store, detail);
  }
}

export default matchDecisionEnter;
