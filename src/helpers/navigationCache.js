import navigationItems from "../data/navigationItems.js";
import { getItem, setItem, removeItem } from "./storage.js";

const NAV_ITEMS_KEY = "navigationItems";

/**
 * Load navigation items from storage or fall back to bundled data.
 *
 * @pseudocode
 * 1. Attempt to read `NAV_ITEMS_KEY` from storage.
 * 2. If cached array exists, return it.
 * 3. Otherwise, store and return the bundled `navigationItems`.
 *
 * @returns {Promise<import("./types.js").NavigationItem[]>} Resolved array of navigation items.
 */
export async function load() {
  const cached = getItem(NAV_ITEMS_KEY);
  if (Array.isArray(cached)) {
    return cached;
  }
  setItem(NAV_ITEMS_KEY, navigationItems);
  return navigationItems;
}

/**
 * Persist navigation items to storage.
 *
 * @pseudocode
 * 1. Store `items` under `NAV_ITEMS_KEY` in storage.
 *
 * @param {import("./types.js").NavigationItem[]} items - Array of navigation items.
 * @returns {Promise<void>} Promise that resolves when saving completes.
 */
export async function save(items) {
  setItem(NAV_ITEMS_KEY, items);
}

/**
 * Remove cached navigation items from storage.
 *
 * @pseudocode
 * 1. Delete `NAV_ITEMS_KEY` from storage.
 */
export function reset() {
  removeItem(NAV_ITEMS_KEY);
}
