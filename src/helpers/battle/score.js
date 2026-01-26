import { STATS } from "../BattleEngine.js";

/**
 * Safely record a query selector error for diagnostics.
 *
 * @pseudocode
 * 1. Attempt to assign error info to window.__classicBattleQuerySelectorError.
 * 2. Silently fail if window is unavailable or assignment blocked.
 *
 * @param {object} errorInfo - Error details to log.
 * @returns {void}
 */
function recordQuerySelectorError(errorInfo) {
  try {
    if (typeof window !== "undefined") {
      window.__classicBattleQuerySelectorError = errorInfo;
    }
  } catch {}
}

/**
 * @summary Retrieve a numeric stat value from a battle score container.
 *
 * @pseudocode
 * 1. Validate that container exists; return 0 if missing.
 * 2. Determine the stat's index within `STATS` and compute the corresponding CSS selector position.
 * 3. Query `container` for the matching `li.stat` span element, capturing query errors for QA diagnostics.
 * 4. Parse the span text as an integer and return it, defaulting to `0` when parsing fails or the span is missing.
 *
 * @param {HTMLElement} container - Element containing stat list items.
 * @param {string} stat - Stat name as defined in `STATS`.
 * @returns {number} Parsed stat value or `0` when missing.
 */
export function getStatValue(container, stat) {
  if (!container) {
    recordQuerySelectorError({ stat, issue: "missing_container" });
    return 0;
  }

  const index = STATS.indexOf(stat) + 1;
  let span = null;

  if (!Number.isFinite(index) || index <= 0) {
    recordQuerySelectorError({ stat, index, issue: "invalid_stat_index" });
  } else {
    try {
      span = container.querySelector(`li.stat:nth-child(${index}) span`);
    } catch (e) {
      recordQuerySelectorError({
        stat,
        index,
        issue: "query_selector_error",
        err: String(e)
      });
    }
  }

  if (!span) return 0;
  const val = parseInt(span.textContent, 10);
  return Number.isFinite(val) ? val : 0;
}
