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
    if (isValidNavigationList(cached)) return cached;
    try {
      console.warn("navigationCache: invalid cached data; clearing");
    } catch {}
    // Remove corrupt value and restore defaults
    removeItem(NAV_ITEMS_KEY);
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
  if (!isValidNavigationList(items)) {
    throw new Error("Invalid navigation items");
  }
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

// --- Validation helpers ---

/**
 * Validate a single navigation item.
 *
 * @pseudocode
 * 1. Ensure required keys exist with correct types: id, gameModeId, url, category, order, isHidden.
 * 2. Return true when valid, false otherwise.
 *
 * @param {any} it
 * @returns {it is import("./types.js").NavigationItem}
 */
function isValidNavigationItem(it) {
  return !!(
    it &&
    typeof it.id === "number" &&
    typeof it.gameModeId === "number" &&
    typeof it.url === "string" &&
    it.url.length > 0 &&
    typeof it.category === "string" &&
    it.category.length > 0 &&
    typeof it.order === "number" &&
    typeof it.isHidden === "boolean"
  );
}

/**
 * Validate a list of navigation items.
 *
 * @pseudocode
 * 1. Return false unless `items` is an array and every entry passes `isValidNavigationItem`.
 *
 * @param {any} items
 * @returns {items is import("./types.js").NavigationItem[]}
 */
function isValidNavigationList(items) {
  return Array.isArray(items) && items.every(isValidNavigationItem);
}
