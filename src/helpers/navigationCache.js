import { getItem, setItem, removeItem } from "./storage.js";

const NAVIGATION_KEY = "navigationItems";

/**
 * Load cached navigation entries from storage.
 *
 * @pseudocode
 * 1. Read the stored value associated with `NAVIGATION_KEY`.
 * 2. Return the cached array when it is valid; otherwise return `null`.
 *
 * @returns {Promise<import("./types.js").NavigationItem[]|null>} Cached navigation items or null when absent.
 */
export async function load() {
  const cached = getItem(NAVIGATION_KEY);
  return Array.isArray(cached) ? cached : null;
}

/**
 * Persist navigation entries to storage.
 *
 * @pseudocode
 * 1. Ensure the provided `items` value is an array.
 * 2. Serialize the array via the shared storage helper.
 *
 * @param {import("./types.js").NavigationItem[]} items - Navigation entries to persist.
 * @returns {Promise<void>} Resolves when the data is stored.
 */
export async function save(items) {
  if (!Array.isArray(items)) {
    throw new TypeError("navigationCache.save expects an array");
  }
  setItem(NAVIGATION_KEY, items);
}

/**
 * Remove cached navigation data from storage.
 *
 * @pseudocode
 * 1. Invoke the shared `removeItem` helper with `NAVIGATION_KEY`.
 *
 * @returns {void}
 */
export function reset() {
  removeItem(NAVIGATION_KEY);
}
