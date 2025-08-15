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
 * @pseudocode
 * 1. Collect stat values from the opponent card when available.
 * 2. Pass the values and `difficulty` to `chooseOpponentStat`.
 * 3. Return the chosen stat.
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
 * @pseudocode
 * 1. Read stat values from both cards.
 * 2. Call `evaluateRoundApi(playerVal, computerVal)`.
 * 3. Sync scores.
 * 4. Show result message and stat comparison.
 * 5. Update debug panel.
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
  // Ensure the header message updates immediately so tests (and users)
  // can observe the outcome without depending on later timers.
  // Write both via the battle UI helper (with fade) and the scoreboard
  // facade to keep the header text in sync.
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
 * Handle player stat selection with a brief delay to reveal the opponent card.
 *
 * @pseudocode
 * 1. Pause the round timer and clear any pending timeouts.
 * 2. Clear the countdown and schedule a transient snackbar hint
 *    "Opponent is choosing…" after 500ms; cancel it if the round resolves
 *    before it displays to avoid occupying the result region.
 * 3. After a short delay, clear the hint and reveal the opponent card then
 *    evaluate the round.
 * 4. If the match ended, clear the round counter.
 * 5. Reset stat buttons and schedule the next round.
 * 6. If the match ended, show the summary panel.
 * 7. Update the debug panel.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Chosen stat key.
 * @param {{delayOpponentMessage?: boolean}} [options={}] - Optional settings.
 * @returns {Promise<{matchEnded: boolean}>}
 */
export async function handleStatSelection(store, stat, options = {}) {
  if (store.selectionMade) {
    return { matchEnded: false };
  }
  const delayOpponentMessage = Boolean(options && options.delayOpponentMessage);
  store.selectionMade = true;
  // Stop the countdown timer to prevent further ticks
  stopTimer();
  clearTimeout(store.statTimeoutId);
  clearTimeout(store.autoSelectId);
  scoreboard.clearTimer();
  // Make Next button clickable immediately so tests can skip without waiting
  // for the cooldown scheduler to initialize. It will act as a skip control
  // until `scheduleNextRound` marks it ready.
  try {
    const nextBtn = document.getElementById("next-button");
    if (nextBtn) {
      nextBtn.disabled = false;
      delete nextBtn.dataset.nextReady;
    }
  } catch {}
  // Start a delayed snackbar hint so the result area stays free for outcomes.
  // Skip this hint when auto-select path requests immediate resolution.
  const opponentSnackbarId = delayOpponentMessage
    ? 0
    : setTimeout(() => showSnackbar("Opponent is choosing…"), 500);
  // For testing stability and clearer UX, pre-compute a tie indication when
  // both visible values are equal. This mirrors the engine's tie message and
  // ensures the header shows a result promptly even before reveal/animations.
  try {
    const playerCard = document.getElementById("player-card");
    const computerCard = document.getElementById("computer-card");
    const pv = getStatValue(playerCard, stat);
    const cv = getStatValue(computerCard, stat);
    if (pv === cv) {
      scoreboard.showMessage("Tie – no score!");
    }
  } catch {}
  const delay = delayOpponentMessage ? 0 : 300 + Math.floor(Math.random() * 401);
  return new Promise((resolve) => {
    setTimeout(async () => {
      // Cancel the hint once the round is ready to resolve.
      if (opponentSnackbarId) clearTimeout(opponentSnackbarId);
      await revealComputerCard();
      const result = evaluateRound(store, stat);
      // Move to decision and then roundOver in the state machine
      await dispatchBattleEvent("outcome=" + result.outcome);
      if (result.matchEnded) {
        scoreboard.clearRoundCounter();
      }
      resetStatButtons();
      // Outcome message was already written synchronously in evaluateRound;
      // avoid writing it again here to reduce flicker.
      // From roundOver, either continue to cooldown or decide match
      if (result.matchEnded) {
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
      resolve(result);
    }, delay);
  });
}
/**
 * Show animated stat comparison for the last round.
 *
 * @pseudocode
 * 1. Locate `#round-result` and exit if missing.
 * 2. Extract previous values from its text when present.
 * 3. Increment both player and opponent values toward targets using
 *    the shared scheduler unless motion is reduced.
 * 4. Update the element text on each frame as "Stat – You: x Opponent: y".
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
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const p = Math.round(startPlayer + (playerVal - startPlayer) * progress);
    const c = Math.round(startComp + (compVal - startComp) * progress);
    el.textContent = `${label} – You: ${p} Opponent: ${c}`;
    if (progress < 1) {
      store.compareRaf = scheduleFrame(step);
    }
  };
  store.compareRaf = scheduleFrame(step);
}
