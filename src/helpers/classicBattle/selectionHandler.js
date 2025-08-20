import { STATS, stopTimer } from "../battleEngineFacade.js";
import { chooseOpponentStat, evaluateRound as evaluateRoundApi } from "../api/battleUI.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { getStatValue, resetStatButtons, showResult } from "../battle/index.js";
import { revealComputerCard } from "./uiHelpers.js";
import { scheduleNextRound } from "./timerService.js";
import { showMatchSummaryModal } from "./uiService.js";
import { handleReplay } from "./roundManager.js";
import { shouldReduceMotionSync } from "../motionUtils.js";
import { syncScoreDisplay } from "./uiService.js";
import { updateDebugPanel } from "./uiHelpers.js";
import { onFrame as scheduleFrame, cancel as cancelFrame } from "../../utils/scheduler.js";
import { dispatchBattleEvent } from "./orchestrator.js";

/**
 * Determine the opponent's stat choice based on difficulty.
 *
 * @param {"easy"|"medium"|"hard"} [difficulty="easy"] Difficulty setting.
 * @returns {string} One of the values from `STATS`.
 */
export function simulateOpponentStat(difficulty = "easy") {
  const card = document.getElementById("computer-card");
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
  const computerCard = document.getElementById("computer-card");
  const playerVal = getStatValue(playerCard, stat);
  const computerVal = getStatValue(computerCard, stat);
  const result = evaluateRoundApi(playerVal, computerVal);
  syncScoreDisplay();
  const msg = result.message || "";
  showResult(msg);
  scoreboard.showMessage(msg);
  showStatComparison(store, stat, playerVal, computerVal);
  updateDebugPanel();
  const outcome =
    playerVal > computerVal ? "winPlayer" : playerVal < computerVal ? "winOpponent" : "draw";
  return { ...result, outcome, playerVal, computerVal };
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
  // Announce evaluation to the orchestrator for observability/tests.
  await dispatchBattleEvent("evaluate");

  const opponentSnackbarId = setTimeout(() => showSnackbar("Opponent is choosing…"), 500);

  const delay = 300 + Math.floor(Math.random() * 401);
  await new Promise(resolve => setTimeout(resolve, delay));

  clearTimeout(opponentSnackbarId);
  await revealComputerCard();
  const result = evaluateRound(store, stat);

  const outcomeEvent =
    result.outcome === "winPlayer"
      ? "outcome=winPlayer"
      : result.outcome === "winOpponent"
        ? "outcome=winOpponent"
        : "outcome=draw";

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
