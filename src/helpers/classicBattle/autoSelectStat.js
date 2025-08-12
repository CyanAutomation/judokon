import { seededRandom } from "../testModeUtils.js";
import { STATS } from "../battleEngineFacade.js";
import * as infoBar from "../setupBattleInfoBar.js";
// Intentionally avoid showing a snackbar here to prevent racing with
// the cooldown countdown snackbar. The auto-select announcement is
// surfaced via the Info Bar message area instead.

const AUTO_SELECT_FEEDBACK_MS = 500;

/**
 * Automatically select a random stat and provide UI feedback.
 *
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>|void} onSelect
 * - Callback to handle the chosen stat.
 * @returns {Promise<void>} Resolves after feedback completes.
 */
export async function autoSelectStat(onSelect) {
  const randomStat = STATS[Math.floor(seededRandom() * STATS.length)];
  const btn = document.querySelector(`#stat-buttons button[data-stat="${randomStat}"]`);
  const label = btn?.textContent || randomStat;
  if (btn) {
    btn.classList.add("selected");
  }
  infoBar.showAutoSelect(label);
  await new Promise((resolve) => setTimeout(resolve, AUTO_SELECT_FEEDBACK_MS));
  await onSelect(randomStat, { delayOpponentMessage: true });
}
