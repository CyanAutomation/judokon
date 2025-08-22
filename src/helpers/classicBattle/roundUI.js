import { disableNextRoundButton, showSelectionPrompt, updateDebugPanel } from "./uiHelpers.js";
import { resetStatButtons } from "../battle/index.js";
import { syncScoreDisplay } from "./uiService.js";
import { startTimer, handleStatSelectionTimeout } from "./timerService.js";
import * as scoreboard from "../setupScoreboard.js";
import { handleStatSelection } from "./selectionHandler.js";

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
 */
export function applyRoundUI(store, roundNumber) {
  resetStatButtons();
  disableNextRoundButton();
  const roundResultEl = document.getElementById("round-result");
  if (roundResultEl) roundResultEl.textContent = "";
  syncScoreDisplay();
  scoreboard.updateRoundCounter(roundNumber);
  showSelectionPrompt();
  startTimer((stat, opts) => handleStatSelection(store, stat, opts));
  store.statTimeoutId = setTimeout(
    () => handleStatSelectionTimeout(store, (s, opts) => handleStatSelection(store, s, opts)),
    35000
  );
  updateDebugPanel();
}
