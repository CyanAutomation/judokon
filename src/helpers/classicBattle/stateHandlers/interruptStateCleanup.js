import { cleanupTimers, logSelectionMutation } from "../selectionHandler.js";
import { debugLog } from "../debugLog.js";

/**
 * Shared state cleanup utility for match and round interrupts.
 *
 * This function safely cleans up all player selection state during interrupts.
 * It combines timer cleanup, player state reset, and test instrumentation cleanup
 * into a single, atomic operation with comprehensive error handling. Errors are
 * logged but suppressed to ensure interrupt handlers always succeed.
 *
 * Use this when interrupting a round or match to ensure consistent state cleanup.
 * Called by: interruptRoundEnter, interruptMatchEnter
 *
 * @pseudocode
 * 1. Clear any running timers to prevent stale callbacks.
 * 2. Reset player choice and selection flags.
 * 3. Clear window instrumentation properties used in tests.
 * 4. Log errors but continue - never throw (safe for interrupt handlers).
 *
 * @example
 * // In interrupt handler
 * import { cleanupInterruptState } from "./interruptStateCleanup.js";
 * const store = machine.context?.store;
 * cleanupInterruptState(store); // Safe even if store is null
 *
 * @param {object} [store] - Battle state store to clean up. May be null/undefined.
 * @returns {void}
 * @note This function will never throw - all errors are logged and suppressed
 *       to ensure interrupt handlers always succeed.
 */
/**
 * Shared state cleanup utility for match and round interrupts.
 *
 * This function safely cleans up all player selection state during interrupts.
 * It combines timer cleanup, player state reset, and test instrumentation cleanup
 * into a single, atomic operation with comprehensive error handling. Errors are
 * logged but suppressed to ensure interrupt handlers always succeed.
 *
 * Use this when interrupting a round or match to ensure consistent state cleanup.
 * Called by: interruptRoundEnter, interruptMatchEnter
 *
 * @pseudocode
 * 1. Clear any running timers to prevent stale callbacks.
 * 2. Reset player choice and selection flags (only if resetSelectionState=true).
 * 3. Clear window instrumentation properties used in tests.
 * 4. Log errors but continue - never throw (safe for interrupt handlers).
 *
 * @example
 * // In interrupt handler - preserve selection state
 * import { cleanupInterruptState } from "./interruptStateCleanup.js";
 * const store = machine.context?.store;
 * cleanupInterruptState(store); // Safe even if store is null
 *
 * // In interrupt handler - reset selection state
 * cleanupInterruptState(store, { resetSelectionState: true });
 *
 * @param {object} [store] - Battle state store to clean up. May be null/undefined.
 * @param {object} [options] - Configuration options.
 * @param {boolean} [options.resetSelectionState=false] - Whether to reset selection flags.
 *   Set to true for match interrupts, false for cooldown/transition interrupts.
 * @returns {void}
 * @note This function will never throw - all errors are logged and suppressed
 *       to ensure interrupt handlers always succeed.
 */
export function cleanupInterruptState(store, { resetSelectionState = false } = {}) {
  // Clear any running timers to prevent stale callbacks
  // (Defensive check: cleanupTimers handles null internally, but fail early to prevent propagation)
  if (store) {
    try {
      cleanupTimers(store);
    } catch (err) {
      debugLog("Timer cleanup failed during interrupt:", err);
    }
  }

  // Reset player choice and selection state only when explicitly requested
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
