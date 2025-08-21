import { STATS, stopTimer } from "../battleEngineFacade.js";
import { chooseOpponentStat, evaluateRound as evaluateRoundApi } from "../api/battleUI.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { getStatValue, resetStatButtons, showResult } from "../battle/index.js";
import { revealOpponentCard } from "./uiHelpers.js";
import { scheduleNextRound } from "./timerService.js";
import { showMatchSummaryModal } from "./uiService.js";
import { handleReplay } from "./roundManager.js";
import { shouldReduceMotionSync } from "../motionUtils.js";
import { syncScoreDisplay } from "./uiService.js";
import { updateDebugPanel } from "./uiHelpers.js";
import { onFrame as scheduleFrame, cancel as cancelFrame } from "../../utils/scheduler.js";

// Local dispatcher to avoid circular import with orchestrator.
// Uses a window-exposed getter set by the orchestrator at runtime.
async function dispatchBattleEvent(eventName, payload) {
  // Primary path: dispatch via the live machine exposed by the orchestrator.
  try {
    if (typeof window !== "undefined") {
      const getMachine = window.__getClassicBattleMachine;
      const machine = typeof getMachine === "function" ? getMachine() : null;
      if (machine && typeof machine.dispatch === "function") {
        return await machine.dispatch(eventName, payload);
      }
    }
  } catch {}
  // Fallback for tests or non-orchestrated flows: call the exported
  // orchestrator function (mockable by Vitest) via dynamic import to
  // avoid a static cycle in production bundles.
  try {
    // Only attempt this in browser-like environments where window exists.
    // In Node test environments (no window), importing the real orchestrator
    // can hang due to DOM/state machine setup.
    if (typeof window === "undefined") return;
    const orchestrator = await import("./orchestrator.js");
    if (orchestrator && typeof orchestrator.dispatchBattleEvent === "function") {
      if (payload === undefined) {
        return await orchestrator.dispatchBattleEvent(eventName);
      }
      return await orchestrator.dispatchBattleEvent(eventName, payload);
    }
  } catch {}
}

/**
 * Determine the opponent's stat choice based on difficulty.
 *
 * @param {"easy"|"medium"|"hard"} [difficulty="easy"] Difficulty setting.
 * @returns {string} One of the values from `STATS`.
 */
export function simulateOpponentStat(difficulty = "easy") {
  const card = document.getElementById("opponent-card");
  const values = card ? STATS.map((stat) => ({ stat, value: getStatValue(card, stat) })) : [];
  return chooseOpponentStat(values, difficulty);
}

/**
 * Evaluate a selected stat and update the UI.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @returns {{message?: string, matchEnded: boolean}}
 */
export function evaluateRound(store, stat) {
  const playerCard = document.getElementById("player-card");
  const opponentCard = document.getElementById("opponent-card");
  const playerVal = getStatValue(playerCard, stat);
  const opponentVal = getStatValue(opponentCard, stat);
  const result = evaluateRoundApi(playerVal, opponentVal);
  syncScoreDisplay();
  const msg = result.message || "";
  showResult(msg);
  scoreboard.showMessage(msg);
  showStatComparison(store, stat, playerVal, opponentVal);
  updateDebugPanel();
  const outcome =
    playerVal > opponentVal ? "winPlayer" : playerVal < opponentVal ? "winOpponent" : "draw";
  return { ...result, outcome, playerVal, opponentVal };
}

/**
 * Handles the player's stat selection.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 */
export async function handleStatSelection(store, stat) {
  if (store.selectionMade) {
    return;
  }
  store.selectionMade = true;
  store.playerChoice = stat;
  stopTimer();
  clearTimeout(store.statTimeoutId);
  clearTimeout(store.autoSelectId);
  scoreboard.clearTimer();
  // If the orchestrator is active, signal selection; otherwise resolve inline
  // to keep tests and non-orchestrated flows moving.
  try {
    const hasMachine = typeof window !== "undefined" && !!window.__classicBattleState;
    if (hasMachine) {
      await dispatchBattleEvent("statSelected");
    } else {
      await resolveRound(store);
    }
  } catch {
    await resolveRound(store);
  }
}

/**
 * Resolves the round after a stat has been selected.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 */
export async function resolveRound(store) {
  const stat = store.playerChoice;
  if (!stat) {
    return;
  }
  // Record round debug info
  try {
    if (typeof window !== "undefined") {
      window.__roundDebug = { playerChoice: stat, startedAt: Date.now() };
    }
  } catch {}
  // Show delayed opponent-choosing hint, then announce evaluation to the orchestrator.
  const opponentSnackbarId = setTimeout(() => showSnackbar("Opponent is choosing…"), 500);
  // Announce evaluation to the orchestrator for observability/tests.
  await dispatchBattleEvent("evaluate");
  try {
    if (typeof window !== "undefined") {
      const rd = window.__roundDebug || {};
      rd.evaluateAt = Date.now();
      window.__roundDebug = rd;
    }
  } catch {}

  const delay = 300 + Math.floor(Math.random() * 401);
  await new Promise((resolve) => setTimeout(resolve, delay));

  clearTimeout(opponentSnackbarId);
  // Do not let opponent reveal block round resolution indefinitely.
  // Proceed if reveal takes too long (e.g., asset/network hiccups).
  try {
    const SLOW = Symbol("slow");
    const timeout = new Promise((resolve) => setTimeout(() => resolve(SLOW), 1000));
    const status = await Promise.race([revealOpponentCard().then(() => "revealed"), timeout]);
    try {
      if (typeof window !== "undefined") {
        const rd = window.__roundDebug || {};
        rd.reveal = status === SLOW ? "timeout" : status;
        window.__roundDebug = rd;
      }
    } catch {}
  } catch {}
  const result = evaluateRound(store, stat);

  const outcomeEvent =
    result.outcome === "winPlayer"
      ? "outcome=winPlayer"
      : result.outcome === "winOpponent"
        ? "outcome=winOpponent"
        : "outcome=draw";

  try {
    if (typeof window !== "undefined") {
      const rd = window.__roundDebug || {};
      rd.outcomeEvent = outcomeEvent;
      rd.resolvedAt = Date.now();
      window.__roundDebug = rd;
    }
  } catch {}
  await dispatchBattleEvent(outcomeEvent);

  if (result.matchEnded) {
    scoreboard.clearRoundCounter();
    await dispatchBattleEvent("matchPointReached");
  } else {
    await dispatchBattleEvent("continue");
  }

  scheduleNextRound(result);

  if (result.matchEnded) {
    showMatchSummaryModal(result, async () => {
      await dispatchBattleEvent("finalize");
      await dispatchBattleEvent("rematch");
      await dispatchBattleEvent("startClicked");
      handleReplay(store);
    });
  }

  updateDebugPanel();
  resetStatButtons();
}

/**
 * Show animated stat comparison for the last round.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Stat key selected for the round.
 * @param {number} playerVal - Player's stat value.
 * @param {number} compVal - Opponent's stat value.
 */
export function showStatComparison(store, stat, playerVal, compVal) {
  const el = document.getElementById("round-result");
  if (!el) return;
  cancelFrame(store.compareRaf);
  const label = stat.charAt(0).toUpperCase() + stat.slice(1);
  const match = el.textContent.match(/You: (\d+).*Opponent: (\d+)/);
  const startPlayer = match ? Number(match[1]) : 0;
  const startComp = match ? Number(match[2]) : 0;
  if (shouldReduceMotionSync()) {
    el.textContent = `${label} – You: ${playerVal} Opponent: ${compVal}`;
    return;
  }
  const startTime = performance.now();
  const duration = 500;
  let id = 0;
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const p = Math.round(startPlayer + (playerVal - startPlayer) * progress);
    const c = Math.round(startComp + (compVal - startComp) * progress);
    el.textContent = `${label} – You: ${p} Opponent: ${c}`;
    if (progress >= 1) {
      cancelFrame(id);
      store.compareRaf = 0;
      return;
    }
    const next = scheduleFrame(step);
    cancelFrame(id);
    id = next;
    store.compareRaf = id;
  };
  id = scheduleFrame(step);
  store.compareRaf = id;
}
