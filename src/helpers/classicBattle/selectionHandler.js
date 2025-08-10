import { STATS, stopTimer } from "../battleEngine.js";
import { chooseOpponentStat, evaluateRound as evaluateRoundApi } from "../api/battleUI.js";
import * as infoBar from "../setupBattleInfoBar.js";
import { getStatValue, resetStatButtons, showResult } from "../battle/index.js";
import { revealComputerCard } from "./uiHelpers.js";
import { scheduleNextRound } from "./timerService.js";
import { showMatchSummaryModal } from "./uiService.js";
import { handleReplay } from "./roundManager.js";
import { shouldReduceMotionSync } from "../motionUtils.js";
import { syncScoreDisplay } from "./uiService.js";
import { updateDebugPanel } from "./uiHelpers.js";

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
  if (result.message) {
    showResult(result.message);
  }
  showStatComparison(store, stat, playerVal, computerVal);
  updateDebugPanel();
  return result;
}

/**
 * Handle player stat selection with a brief delay to reveal the opponent card.
 *
 * @pseudocode
 * 1. Pause the round timer and clear any pending timeouts.
 * 2. Clear the countdown and show "Opponent is choosing…" in the info bar.
 *    When `delayOpponentMessage` is true, delay the message by 500ms and
 *    cancel it if the round resolves before it displays.
 * 3. After a short delay, reveal the opponent card and evaluate the round.
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
  store.selectionMade = true;
  // Stop the countdown timer to prevent further ticks
  stopTimer();
  clearTimeout(store.statTimeoutId);
  clearTimeout(store.autoSelectId);
  infoBar.clearTimer();
  let opponentMsgId = 0;
  if (options.delayOpponentMessage) {
    opponentMsgId = setTimeout(() => infoBar.showMessage("Opponent is choosing…"), 500);
  } else {
    infoBar.showMessage("Opponent is choosing…");
  }
  const delay = 300 + Math.floor(Math.random() * 401);
  return new Promise((resolve) => {
    setTimeout(async () => {
      clearTimeout(opponentMsgId);
      await revealComputerCard();
      const result = evaluateRound(store, stat);
      if (result.matchEnded) {
        infoBar.clearRoundCounter();
      }
      resetStatButtons();
      scheduleNextRound(result);
      if (result.matchEnded) {
        showMatchSummaryModal(result, () => handleReplay(store));
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
 *    `requestAnimationFrame` unless motion is reduced.
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
  cancelAnimationFrame(store.compareRaf);
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
      store.compareRaf = requestAnimationFrame(step);
    }
  };
  store.compareRaf = requestAnimationFrame(step);
}
