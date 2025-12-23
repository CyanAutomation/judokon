/**
 * selectionDelayCalculator.js
 *
 * Encapsulates delay calculation logic for stat selection.
 * Provides helper functions and constants for computing when stat selection
 * should be considered "ready" based on timing constraints.
 *
 * @pseudocode
 * - Export base delay constant
 * - Provide utility to check for delay overrides (testing)
 * - Support configuration lookups for buffer times
 */

/**
 * Get the base selection-ready delay constant.
 * This is the minimum delay before stat selection is considered ready,
 * computed as the maximum of:
 * - CONFIG.POST_SELECTION_READY_DELAY_MS
 * - CONFIG.OPPONENT_MESSAGE_BUFFER_MS
 *
 * @returns {number} The base delay in milliseconds
 * @pseudocode
 * 1. Attempt to load `CONFIG` lazily to avoid circular imports.
 * 2. If available, return the max of `POST_SELECTION_READY_DELAY_MS` and `OPPONENT_MESSAGE_BUFFER_MS`.
 * 3. On failure, return a safe default of 50 ms.
 */
export function getBaseSelectionReadyDelay() {
  // Lazy-load to avoid circular dependencies
  try {
    const { CONFIG } = require("../config/constants.js");
    return Math.max(CONFIG.POST_SELECTION_READY_DELAY_MS, CONFIG.OPPONENT_MESSAGE_BUFFER_MS);
  } catch {
    // Fallback to reasonable defaults if CONFIG unavailable
    return 50;
  }
}

/**
 * Check if a delay override is set via window object (for testing).
 * This allows tests to inject custom delay values.
 *
 * @returns {number | null} The override delay in milliseconds, or null if not set
 * @pseudocode
 * 1. Verify we are in a browser environment and `__OPPONENT_RESOLVE_DELAY_MS` is numeric.
 * 2. If valid, coerce the override to a number and return it.
 * 3. Otherwise, return `null` to signal no override.
 */
export function getSelectionDelayOverride() {
  if (typeof window !== "undefined" && typeof window.__OPPONENT_RESOLVE_DELAY_MS === "number") {
    return Number(window.__OPPONENT_RESOLVE_DELAY_MS);
  }
  return null;
}

/**
 * Calculate delay including opponent message buffer.
 * Given an opponent delay value, compute the total delay accounting for
 * the configured buffer time after the opponent message.
 *
 * @param {number} opponentDelay - The opponent message delay in milliseconds
 * @returns {number} The adjusted delay in milliseconds
 * @pseudocode
 * 1. If `opponentDelay` is non-numeric or negative, return 0 immediately.
 * 2. Try to load the buffer value from `CONFIG.OPPONENT_MESSAGE_BUFFER_MS`.
 * 3. Add the buffer to the opponent delay and return the sum.
 * 4. If the config load fails, add a fallback buffer of 100 ms instead.
 */
export function computeDelayWithOpponentBuffer(opponentDelay) {
  if (!Number.isFinite(opponentDelay) || opponentDelay < 0) {
    return 0;
  }
  try {
    const { CONFIG } = require("../config/constants.js");
    return opponentDelay + CONFIG.OPPONENT_MESSAGE_BUFFER_MS;
  } catch {
    return opponentDelay + 100; // Fallback buffer
  }
}
