import { seededRandom } from "../testModeUtils.js";
import { STATS } from "../battleEngineFacade.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
// Avoid writing to the header message area during auto-select; tests expect
// the outcome message to occupy that region immediately after selection.
// Intentionally avoid showing a snackbar here to prevent racing with
// the cooldown countdown snackbar. The auto-select announcement is
// surfaced via the Scoreboard message area instead.

const AUTO_SELECT_FEEDBACK_MS = 500;

/**
 * Automatically select a random stat and provide UI feedback.
 * Avoids snackbar to prevent race conditions with the cooldown countdown.
 *
 * @pseudocode
 * pick random stat from STATS
 * mark corresponding button as selected
 * wait AUTO_SELECT_FEEDBACK_MS
 * dispatch "statSelected" battle event
 * invoke onSelect with random stat and delayOpponentMessage true
 *
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>|void} onSelect
 * - Callback to handle the chosen stat.
 * @returns {Promise<void>} Resolves after feedback completes.
 */
export async function autoSelectStat(onSelect) {
  const randomStat = STATS[Math.floor(seededRandom() * STATS.length)];
  const btn = document.querySelector(`#stat-buttons button[data-stat="${randomStat}"]`);
  if (btn) btn.classList.add("selected");
  await new Promise((resolve) => setTimeout(resolve, AUTO_SELECT_FEEDBACK_MS));
  // Ensure timeout event is observed even in environments where the
  // timer's own dispatch might be skipped by mocks.
  try {
    await dispatchBattleEvent("timeout");
  } catch {}
  await dispatchBattleEvent("statSelected");
  await onSelect(randomStat, { delayOpponentMessage: true });
}
