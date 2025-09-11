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
 * Preloads judoka and gokyo data required for random card generation.
 *
 * @summary This asynchronous function fetches the `judoka.json` and `gokyo.json`
 * data files in parallel, which are essential for generating random judoka cards.
 *
 * @pseudocode
 * 1. Initiate two parallel fetch requests using `fetchJson`: one for `judoka.json` and another for `gokyo.json`, both resolved against `DATA_DIR`.
 * 2. Use `Promise.all()` to await the completion of both requests.
 * 3. If both requests are successful, return an object containing `judokaData` and `gokyoData`, with `error` set to `null`.
 * 4. If any request fails (caught by the `catch` block):
 *    a. Log the error to the console.
 *    b. Return an object with `judokaData` and `gokyoData` set to `null`, and the encountered `error` object.
 *
 * @returns {Promise<{judokaData: any[]|null, gokyoData: any[]|null, error: Error|null}>}
 *   A promise that resolves with an object containing the fetched datasets or an error if loading fails.
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
 * Creates a manager for maintaining a history of recently drawn judoka.
 *
 * @summary This function provides an interface to add new judoka to a history
 * and retrieve the current history, with an optional limit on the number of
 * entries to retain.
 *
 * @pseudocode
 * 1. Initialize an empty array `history` to store the judoka entries.
 * 2. Return an object with two methods:
 *    a. `add(judoka)`:
 *       i. If `judoka` is null or undefined, return the current `history` without modification.
 *       ii. Prepend the `judoka` to the `history` array using `unshift()`.
 *       iii. If the `history` array's length exceeds the `limit`, remove the oldest entry using `pop()`.
 *       iv. Return the updated `history` array.
 *    b. `get()`:
 *       i. Return a shallow copy of the `history` array using the spread operator (`...history`) to prevent external modification of the internal state.
 *
 * @param {number} [limit=5] - The maximum number of judoka entries to retain in the history. Defaults to 5.
 * @returns {{ add: (j: any) => any[], get: () => any[] }}
 *   An object containing `add` and `get` functions for managing the history list.
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
