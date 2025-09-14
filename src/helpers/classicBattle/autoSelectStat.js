import { seededRandom } from "../testModeUtils.js";
import { STATS } from "../battleEngineFacade.js";
import { showAutoSelect } from "../setupScoreboard.js";
// Announce auto-select in the Scoreboard header to satisfy PRD acceptance
// criteria and avoid racing with the cooldown snackbar updates.

const AUTO_SELECT_FEEDBACK_MS = 500;
const DEFAULT_FEEDBACK_DELAY_MS =
  typeof process !== "undefined" && process.env && process.env.VITEST ? 0 : AUTO_SELECT_FEEDBACK_MS;

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
 * @param {number} [feedbackDelayMs=DEFAULT_FEEDBACK_DELAY_MS] - Visual delay before dispatch.
 * @returns {Promise<void>} Resolves after feedback completes.
 */
export async function autoSelectStat(onSelect, feedbackDelayMs = DEFAULT_FEEDBACK_DELAY_MS) {
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
  // Announce in the scoreboard header (capitalize for readability)
  try {
    const label =
      typeof randomStat === "string"
        ? randomStat.charAt(0).toUpperCase() + randomStat.slice(1)
        : String(randomStat);
    showAutoSelect(label);
  } catch {}
  if (feedbackDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, feedbackDelayMs));
  }
  // Let the provided onSelect drive resolution via handleStatSelection.
  // This sets store.playerChoice before the round is resolved and
  // `roundResolved` is dispatched, preventing a race where
  // roundDecisionEnter sees no selection and interrupts.
  await onSelect(randomStat, { delayOpponentMessage: true });
}
