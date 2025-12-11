import { cleanupTimers, logSelectionMutation } from "../selectionHandler.js";
import { debugLog } from "../debugLog.js";

/**
 * Shared cleanup utility for match and round interrupts.
 *
 * @param {object} [store] - Battle state store to clean up. May be null/undefined.
 * @param {object} [options] - Configuration options.
 * @param {boolean} [options.resetSelectionState=true] - Clears `playerChoice`, `selectionMade`, and
 *   `__lastSelectionMade`. Keep the default (`true`) for round interrupts so the next round never
 *   inherits stale selections; set to `false` only when a match-level interrupt needs to preserve
 *   the last selection for debugging or post-match analysis.
 * @returns {void}
 * @pseudocode
 * 1. Clear any active timers to prevent stale callbacks.
 * 2. Reset or preserve selection fields according to `resetSelectionState`.
 * 3. Clear window instrumentation flags; log and suppress any errors.
 * @note This function will never throw - all errors are logged and suppressed to ensure interrupt
 *       handlers always succeed.
 */
export function cleanupInterruptState(store, { resetSelectionState = true } = {}) {
  // Clear any running timers to prevent stale callbacks
  // (Defensive check: cleanupTimers handles null internally, but fail early to prevent propagation)
  if (store) {
    try {
      cleanupTimers(store);
    } catch (err) {
      debugLog("Timer cleanup failed during interrupt:", err);
    }
  }

  // Reset player choice and selection state unless explicitly preserved
  // (Required check: direct property assignment needs non-null store)
  if (store) {
    try {
      if (resetSelectionState) {
        // playerChoice: The stat key selected by the player (e.g., 'power', 'speed')
        store.playerChoice = null;
        // selectionMade: Whether the player has completed stat selection
        store.selectionMade = false;
        // __lastSelectionMade: Finalization state to prevent duplicate selection processing
        store.__lastSelectionMade = false;
        logSelectionMutation("interrupt.cleanup.reset", store);
      } else {
        logSelectionMutation("interrupt.cleanup.preserve", store);
      }
    } catch (err) {
      debugLog("Player state cleanup failed during interrupt:", err);
    }
  }

  // Clear window instrumentation properties (always attempt - separate from store)
  // Window properties are test/debug-only and don't require store context, so cleanup
  // happens unconditionally. These track selection finalization state during browser tests.
  try {
    if (typeof window !== "undefined") {
      window.__classicBattleSelectionFinalized = false;
      window.__classicBattleLastFinalizeContext = null;
    }
  } catch (err) {
    debugLog("Window instrumentation cleanup failed during interrupt:", err);
  }
}
