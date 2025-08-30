/**
 * Service utilities for the Random Judoka feature.
 *
 * @pseudocode
 * preloadRandomCardData
 * 1. Fetch `judoka.json` and `gokyo.json` in parallel.
 * 2. Return both datasets when successful.
 * 3. On error, log the issue and return the error for the caller.
 *
 * createHistoryManager
 * 1. Maintain an internal array of recent judoka draws.
 * 2. `add` prepends a judoka and trims the array to `limit` entries.
 * 3. `get` returns a shallow copy of the history array.
 */
import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

/**
 * Preload judoka and gokyo data required for random card generation.
 *
 * @returns {Promise<{judokaData: any[]|null, gokyoData: any[]|null, error: Error|null}>}
 *   Resolves with the datasets or an error when loading fails.
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
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export async function preloadRandomCardData() {
  try {
    const [judokaData, gokyoData] = await Promise.all([
      fetchJson(`${DATA_DIR}judoka.json`),
      fetchJson(`${DATA_DIR}gokyo.json`)
    ]);
    return { judokaData, gokyoData, error: null };
  } catch (error) {
    console.error("Error preloading data:", error);
    return { judokaData: null, gokyoData: null, error };
  }
}

/**
 * Create a manager for recent judoka history.
 *
 * @param {number} [limit=5] - Maximum history entries to retain.
 * @returns {{ add: (j: any) => any[], get: () => any[] }}
 *   Functions to add to and retrieve the history list.
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
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function createHistoryManager(limit = 5) {
  const history = [];
  return {
    add(judoka) {
      if (!judoka) return history;
      history.unshift(judoka);
      if (history.length > limit) history.pop();
      return history;
    },
    get() {
      return [...history];
    }
  };
}
