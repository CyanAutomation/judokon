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
 * wait `feedbackDelayMs`
 * dispatch "statSelected" battle event
 * invoke onSelect with random stat and delayOpponentMessage true
 *
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>|void} onSelect
 * - Callback to handle the chosen stat.
 * @param {number} [feedbackDelayMs=AUTO_SELECT_FEEDBACK_MS] - Visual delay before dispatch.
 * @returns {Promise<void>} Resolves after feedback completes.
 */
export async function autoSelectStat(onSelect, feedbackDelayMs = AUTO_SELECT_FEEDBACK_MS) {
  const randomStat = STATS[Math.floor(seededRandom() * STATS.length)];
  // Defensive: ensure randomStat is a string before using it in a selector
  let btn = null;
  try {
    if (typeof randomStat !== "string") {
      try {
        if (typeof window !== "undefined")
          window.__classicBattleQuerySelectorError = { randomStat, where: "autoSelectStat" };
      } catch {}
    } else {
      btn = document.querySelector(`#stat-buttons button[data-stat="${randomStat}"]`);
    }
  } catch (e) {
    try {
      if (typeof window !== "undefined")
        window.__classicBattleQuerySelectorError = {
          randomStat,
          where: "autoSelectStat",
          err: String(e)
        };
    } catch {}
  }
  if (btn) btn.classList.add("selected");
  await new Promise((resolve) => setTimeout(resolve, feedbackDelayMs));
  // Ensure timeout event is observed even in environments where the
  // timer's own dispatch might be skipped by mocks.
  try {
    await dispatchBattleEvent("timeout");
  } catch {}
  await dispatchBattleEvent("statSelected");
  await onSelect(randomStat, { delayOpponentMessage: true });
}
