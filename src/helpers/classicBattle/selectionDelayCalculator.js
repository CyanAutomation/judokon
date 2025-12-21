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
 */
export function getBaseSelectionReadyDelay() {
  // Lazy-load to avoid circular dependencies
  try {
    const { CONFIG } = require("../config/constants.js");
    return Math.max(
      CONFIG.POST_SELECTION_READY_DELAY_MS,
      CONFIG.OPPONENT_MESSAGE_BUFFER_MS
    );
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
