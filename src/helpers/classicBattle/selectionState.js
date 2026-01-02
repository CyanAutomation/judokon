/**
 * Unified selection finalization management
 *
 * Ensures store.selectionMade and window.__classicBattleSelectionFinalized stay in sync
 * Store is the single source of truth; window global is a diagnostic mirror for tests
 *
 * @pseudocode
 * 1. Store.selectionMade is the authoritative state
 * 2. Window global is automatically synchronized for test observability
 * 3. All code should modify via setSelectionFinalized() to maintain consistency
 */

/**
 * Set selection finalized state (unified source of truth)
 *
 * @param {object} store - Battle store
 * @param {boolean} value - Whether selection is finalized
 * @param {string} context - Context string for diagnostics ("advance", etc.)
 * @returns {boolean} True if successful
 *
 * @pseudocode
 * 1. Validate store parameter
 * 2. Set store.selectionMade as source of truth
 * 3. Mirror to window.__classicBattleSelectionFinalized for test observability
 * 4. Update context tracking in window.__classicBattleLastFinalizeContext
 *
 * @example
 * setSelectionFinalized(store, true, "advance");
 */
export function setSelectionFinalized(store, value, context = null) {
  if (!store || typeof store !== "object") {
    return false;
  }

  try {
    // Store is the single source of truth
    store.selectionMade = Boolean(value);

    // Mirror to window global for test observability
    if (typeof window !== "undefined") {
      window.__classicBattleSelectionFinalized = Boolean(value);
      window.__classicBattleLastFinalizeContext = context;
    }

    return true;
    // eslint-disable-next-line no-unused-vars
  } catch (_error) {
    // Silently handle errors to prevent disruption
    return false;
  }
}

/**
 * Get selection finalized state (reads from store, window is fallback)
 *
 * @param {object} store - Battle store (preferred source)
 * @returns {boolean} Whether selection is finalized
 *
 * @pseudocode
 * 1. If store available, return store.selectionMade (source of truth)
 * 2. Otherwise fallback to window.__classicBattleSelectionFinalized
 * 3. Return Boolean coercion to handle undefined/null
 *
 * @example
 * const isFinalized = getSelectionFinalized(store);
 */
export function getSelectionFinalized(store) {
  // Prefer store as source of truth
  if (store && typeof store === "object" && "selectionMade" in store) {
    return Boolean(store.selectionMade);
  }

  // Fallback to window global for tests that don't have store access
  if (typeof window !== "undefined" && "__classicBattleSelectionFinalized" in window) {
    return Boolean(window.__classicBattleSelectionFinalized);
  }

  return false;
}

/**
 * Reset selection finalized state to false
 *
 * @param {object} store - Battle store
 * @returns {boolean} True if successful
 * * @pseudocode
 * 1. Call setSelectionFinalized with false value
 * 2. Pass null context to clear diagnostic tracking
 * * @example
 * resetSelectionFinalized(store);
 */
export function resetSelectionFinalized(store) {
  return setSelectionFinalized(store, false, null);
}

export default {
  setSelectionFinalized,
  getSelectionFinalized,
  resetSelectionFinalized
};
