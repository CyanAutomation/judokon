import { STATS } from "../battleEngineFacade.js";

/**
 * @summary Retrieve a numeric stat value from a battle score container.
 *
 * @pseudocode
 * 1. Determine the stat's index within `STATS` and compute the corresponding CSS selector position.
 * 2. Query `container` for the matching `li.stat` span element, capturing query errors for QA diagnostics.
 * 3. Parse the span text as an integer and return it, defaulting to `0` when parsing fails or the span is missing.
 *
 * @param {HTMLElement} container - Element containing stat list items.
 * @param {string} stat - Stat name as defined in `STATS`.
 * @returns {number} Parsed stat value or `0` when missing.
 */
export function getStatValue(container, stat) {
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
