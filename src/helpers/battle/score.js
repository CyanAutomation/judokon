import { STATS } from "../battleEngineFacade.js";

/**
 * Retrieve a numeric stat value from a battle score container.
 *
 * @pseudocode
 * 1. Determine the stat's position in `STATS` and add one for the CSS selector.
 * 2. Query `container` for `li.stat:nth-child(index) span`.
 * 3. Return the parsed integer value, or `0` if no span is found.
 *
 * @param {HTMLElement} container - Element containing stat list items.
 * @param {string} stat - Stat name as defined in `STATS`.
 * @returns {number} Parsed stat value or `0` when missing.
 */
function getStatValue(container, stat) {
  const index = STATS.indexOf(stat) + 1;
  // Defensive: ensure index is a finite number before using it in a selector
  let span = null;
  try {
    if (!Number.isFinite(index) || index <= 0) {
      try {
        if (typeof window !== "undefined")
          window.__classicBattleQuerySelectorError = { stat, index, where: "getStatValue" };
      } catch {}
    } else {
      span = container.querySelector(`li.stat:nth-child(${index}) span`);
    }
  } catch (e) {
    try {
      if (typeof window !== "undefined")
        window.__classicBattleQuerySelectorError = {
          stat,
          index,
          where: "getStatValue",
          err: String(e)
        };
    } catch {}
  }
  if (!span) return 0;
  const val = parseInt(span.textContent, 10);
  return Number.isFinite(val) ? val : 0;
}

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Retrieve a numeric stat value from a battle score container.
 *
 * @summary Return the integer stat value for `stat` inside the provided container.
 * @pseudocode
 * 1. Compute the stat index from `STATS` and select the matching `li.stat` span.
 * 2. Parse the span textContent as an integer and return it, or `0` on failure.
 *
 * @param {HTMLElement} container - Element containing stat list items.
 * @param {string} stat - Stat name as defined in `STATS`.
 * @returns {number}
 */
export { getStatValue };
