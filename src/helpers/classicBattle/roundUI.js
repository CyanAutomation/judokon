import { disableNextRoundButton, showSelectionPrompt, updateDebugPanel } from "./uiHelpers.js";
import { resetStatButtons } from "../battle/index.js";
import { syncScoreDisplay } from "./uiService.js";
import { startTimer, handleStatSelectionTimeout, scheduleNextRound } from "./timerService.js";
import * as scoreboard from "../setupScoreboard.js";
import { handleStatSelection } from "./selectionHandler.js";
import { showMatchSummaryModal } from "./uiService.js";
import { handleReplay } from "./roundManager.js";
import { onBattleEvent, emitBattleEvent } from "./battleEvents.js";

/**
 * Apply UI updates for a newly started round.
 *
 * @pseudocode
 * 1. Reset stat buttons and disable the Next Round button.
 * 2. Clear the round result display and sync the score.
 * 3. Update the round counter and show the selection prompt.
 * 4. Start the round timer and stall timeout.
 * 5. Update the debug panel.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - Battle state store.
 * @param {number} roundNumber - Current round number to display.
 * @param {number} [stallTimeoutMs=35000] - Delay before auto-select kicks in.
 */
export function applyRoundUI(store, roundNumber, stallTimeoutMs = 35000) {
  resetStatButtons();
  disableNextRoundButton();
  const roundResultEl = document.getElementById("round-result");
  if (roundResultEl) roundResultEl.textContent = "";
  syncScoreDisplay();
  scoreboard.updateRoundCounter(roundNumber);
  showSelectionPrompt();
  startTimer((stat, opts) => handleStatSelection(store, stat, opts));
  store.stallTimeoutMs = stallTimeoutMs;
  store.statTimeoutId = setTimeout(
    () => handleStatSelectionTimeout(store, (s, opts) => handleStatSelection(store, s, opts)),
    store.stallTimeoutMs
  );
  updateDebugPanel();
}

// --- Event bindings ---

onBattleEvent("roundStarted", (e) => {
  const { store, roundNumber } = e.detail || {};
  if (store && typeof roundNumber === "number") {
    applyRoundUI(store, roundNumber);
  }
});

onBattleEvent("roundResolved", (e) => {
  const { store, result } = e.detail || {};
  if (!result) return;
  syncScoreDisplay();
  scheduleNextRound(result);
  if (result.matchEnded) {
    scoreboard.clearRoundCounter();
    showMatchSummaryModal(result, async () => {
      await handleReplay(store);
    });
    emitBattleEvent("matchOver");
  }
  resetStatButtons();
  updateDebugPanel();
});
