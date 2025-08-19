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
  const span = container.querySelector(`li.stat:nth-child(${index}) span`);
  if (!span) return 0;
  const val = parseInt(span.textContent, 10);
  return Number.isFinite(val) ? val : 0;
}

export { getStatValue };
