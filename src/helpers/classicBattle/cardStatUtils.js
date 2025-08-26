import { getStatValue } from "../battle/index.js";

/**
 * Retrieve a stat value from a battle card element.
 *
 * @pseudocode
 * 1. Delegate to `getStatValue` with the provided `container` and `stat`.
 *
 * @param {HTMLElement} container - Card element containing stat list items.
 * @param {string} stat - Stat key to look up.
 * @returns {number} Parsed stat value or `0` when missing.
 */
export function getCardStatValue(container, stat) {
  return getStatValue(container, stat);
}
