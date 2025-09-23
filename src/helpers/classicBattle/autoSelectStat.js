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
 * if userStats provided: pick stat with highest value from userStats
 * else: pick random stat from STATS
 * mark corresponding button as selected
 * wait `feedbackDelayMs`
 * dispatch "statSelected" battle event
 * invoke onSelect with selected stat and delayOpponentMessage true
 *
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>|void} onSelect
 * - Callback to handle the chosen stat.
 * @param {number} [feedbackDelayMs=DEFAULT_FEEDBACK_DELAY_MS] - Visual delay before dispatch.
 * @param {object} [userStats] - User's judoka stats object to select the highest stat.
 * @returns {Promise<void>} Resolves after feedback completes.
 */
export async function autoSelectStat(
  onSelect,
  feedbackDelayMs = DEFAULT_FEEDBACK_DELAY_MS,
  userStats
) {
  let selectedStat;
  if (userStats && typeof userStats === "object") {
    // Select the stat with the highest value
    const entries = Object.entries(userStats);
    if (entries.length > 0) {
      const [stat] = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
      selectedStat = stat;
    } else {
      selectedStat = STATS[Math.floor(seededRandom() * STATS.length)];
    }
  } else {
    selectedStat = STATS[Math.floor(seededRandom() * STATS.length)];
  }
  // Defensive: ensure selectedStat is a string before using it in a selector
  let btn = null;
  try {
    if (typeof selectedStat !== "string") {
      try {
        if (typeof window !== "undefined")
          window.__classicBattleQuerySelectorError = { selectedStat, where: "autoSelectStat" };
      } catch {}
    } else {
      btn = document.querySelector(`#stat-buttons button[data-stat="${selectedStat}"]`);
    }
  } catch (e) {
    try {
      if (typeof window !== "undefined")
        window.__classicBattleQuerySelectorError = {
          selectedStat,
          where: "autoSelectStat",
          err: String(e)
        };
    } catch {}
  }
  if (btn) btn.classList.add("selected");
  // Announce in the scoreboard header (capitalize for readability)
  try {
    const label =
      typeof selectedStat === "string"
        ? selectedStat.charAt(0).toUpperCase() + selectedStat.slice(1)
        : String(selectedStat);
    showAutoSelect(label);
  } catch {}
  if (feedbackDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, feedbackDelayMs));
  }
  // Let the provided onSelect drive resolution via handleStatSelection.
  // This sets store.playerChoice before the round is resolved and
  // `roundResolved` is dispatched, preventing a race where
  // roundDecisionEnter sees no selection and interrupts.
  await onSelect(selectedStat, { delayOpponentMessage: true });
}
