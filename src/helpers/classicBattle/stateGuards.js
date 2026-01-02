/**
 * State machine guard utilities for defensive programming
 *
 * Provides reusable patterns for preventing race conditions when modifying
 * state during async operations. Based on the pattern from roundManager.js
 * lines 967-986 (finalizeReadyControls).
 *
 * @pseudocode
 * 1. Check if state machine is available and has getState method
 * 2. Verify current state matches expected states
 * 3. Only execute callback if state is valid
 * 4. Return boolean indicating whether callback was executed
 */

/**
 * Execute a callback only if the state machine is in one of the expected states
 *
 * @param {object} machine - State machine instance
 * @param {string|string[]} expectedStates - Single state or array of valid states
 * @param {Function} callback - Function to execute if state is valid
 * @param {object} options - Additional options
 * @param {Function} options.onInvalidState - Optional callback when state is invalid
 * @param {string} options.debugContext - Optional context label for debugging
 * @returns {boolean} True if callback was executed, false otherwise
 *
 * @example
 * // Single expected state
 * const executed = withStateGuard(machine, "cooldown", () => {
 *   updateRoundState();
 * });
 *
 * @example
 * // Multiple valid states
 * const executed = withStateGuard(
 *   machine,
 *   ["cooldown", "roundStart"],
 *   () => {
 *     updateRoundState();
 *   },
 *   {
 *     debugContext: "cooldownEnter",
 *     onInvalidState: (currentState) => {
 *       console.warn(`Unexpected state: ${currentState}`);
 *     }
 *   }
 * );
 */
export function withStateGuard(machine, expectedStates, callback, options = {}) {
  // Normalize expectedStates to array
  const validStates = Array.isArray(expectedStates) ? expectedStates : [expectedStates];

  // Defensive checks
  if (!machine) {
    if (options.debugContext) {
      try {
        console.debug(`[${options.debugContext}] No machine provided to withStateGuard`);
      } catch {}
    }
    return false;
  }

  if (typeof machine.getState !== "function") {
    if (options.debugContext) {
      try {
        console.debug(`[${options.debugContext}] Machine has no getState method`);
      } catch {}
    }
    return false;
  }

  // Check current state
  let currentState;
  try {
    currentState = machine.getState();
  } catch (error) {
    if (options.debugContext) {
      try {
        console.debug(`[${options.debugContext}] Error getting state:`, error);
      } catch {}
    }
    return false;
  }

  // Verify state is valid
  const isValidState = validStates.includes(currentState);
  if (!isValidState) {
    if (options.onInvalidState && typeof options.onInvalidState === "function") {
      try {
        options.onInvalidState(currentState, validStates);
      } catch {}
    }
    return false;
  }

  // Execute callback if state is valid
  try {
    callback();
    return true;
  } catch (error) {
    if (options.debugContext) {
      try {
        console.debug(`[${options.debugContext}] Error in guarded callback:`, error);
      } catch {}
    }
    return false;
  }
}

/**
 * Async version of withStateGuard for async callbacks
 *
 * @param {object} machine - State machine instance
 * @param {string|string[]} expectedStates - Single state or array of valid states
 * @param {Function} callback - Async function to execute if state is valid
 * @param {object} options - Additional options
 * @returns {Promise<boolean>} True if callback was executed, false otherwise
 *
 * @example
 * const executed = await withStateGuardAsync(machine, "roundDecision", async () => {
 *   await resolveRound();
 * });
 */
export async function withStateGuardAsync(machine, expectedStates, callback, options = {}) {
  // Reuse validation logic from sync version
  const validStates = Array.isArray(expectedStates) ? expectedStates : [expectedStates];

  if (!machine || typeof machine.getState !== "function") {
    return false;
  }

  let currentState;
  try {
    currentState = machine.getState();
  } catch {
    return false;
  }

  const isValidState = validStates.includes(currentState);
  if (!isValidState) {
    if (options.onInvalidState && typeof options.onInvalidState === "function") {
      try {
        options.onInvalidState(currentState, validStates);
      } catch {}
    }
    return false;
  }

  try {
    await callback();
    return true;
  } catch (error) {
    if (options.debugContext) {
      try {
        console.debug(`[${options.debugContext}] Error in guarded async callback:`, error);
      } catch {}
    }
    return false;
  }
}

/**
 * Guard for modifying window globals
 * Wraps window assignments in try-catch to prevent errors in non-browser environments
 *
 * @param {string} key - Window global key
 * @param {*} value - Value to assign
 * @param {object} options - Options
 * @param {boolean} options.requireWindow - If true, throw if window unavailable
 * @returns {boolean} True if assignment succeeded
 *
 * @example
 * const success = guardWindowAssignment("__classicBattleSelectionFinalized", true);
 */
export function guardWindowAssignment(key, value, options = {}) {
  try {
    if (typeof window === "undefined") {
      if (options.requireWindow) {
        throw new Error("Window is not available");
      }
      return false;
    }
    window[key] = value;
    return true;
  } catch (error) {
    if (options.debugContext) {
      try {
        console.debug(`[${options.debugContext}] Error assigning window.${key}:`, error);
      } catch {}
    }
    return false;
  }
}

/**
 * Guard for modifying store properties
 * Validates store exists and property assignment succeeds
 *
 * @param {object} store - Store object
 * @param {string} key - Store property key
 * @param {*} value - Value to assign
 * @param {object} options - Options
 * @returns {boolean} True if assignment succeeded
 *
 * @example
 * const success = guardStoreAssignment(store, "selectionMade", false);
 */
export function guardStoreAssignment(store, key, value, options = {}) {
  try {
    if (!store || typeof store !== "object") {
      if (options.debugContext) {
        try {
          console.debug(`[${options.debugContext}] Invalid store object`);
        } catch {}
      }
      return false;
    }
    store[key] = value;
    return true;
  } catch (error) {
    if (options.debugContext) {
      try {
        console.debug(`[${options.debugContext}] Error assigning store.${key}:`, error);
      } catch {}
    }
    return false;
  }
}

export default {
  withStateGuard,
  withStateGuardAsync,
  guardWindowAssignment,
  guardStoreAssignment
};
