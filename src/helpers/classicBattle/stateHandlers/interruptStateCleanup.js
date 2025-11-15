import { cleanupTimers } from "../selectionHandler.js";
import { debugLog } from "../debugLog.js";

/**
 * Shared state cleanup utility for match and round interrupts.
 *
 * @pseudocode
 * 1. Clear any running timers to prevent stale callbacks.
 * 2. Reset player choice and selection flags.
 * 3. Clear window instrumentation properties used in tests.
 * 4. Silently continue on errors to prevent interrupt failure.
 *
 * @param {object} [store] - Battle state store to clean up.
 * @returns {void}
 */
export function cleanupInterruptState(store) {
  // Clear any running timers to prevent stale callbacks
  if (store) {
    try {
      cleanupTimers(store);
    } catch (err) {
      debugLog("Timer cleanup failed during interrupt:", err);
    }
  }

  // Reset player choice and selection state
  if (store) {
    try {
      store.playerChoice = null;
      store.selectionMade = false;
      // __lastSelectionMade tracks the finalization state to prevent duplicate selections
      store.__lastSelectionMade = false;
    } catch (err) {
      debugLog("Player state cleanup failed during interrupt:", err);
    }
  }

  // Clear test instrumentation properties
  try {
    if (typeof window !== "undefined") {
      window.__classicBattleSelectionFinalized = false;
      window.__classicBattleLastFinalizeContext = null;
    }
  } catch (err) {
    debugLog("Window instrumentation cleanup failed during interrupt:", err);
  }
}
