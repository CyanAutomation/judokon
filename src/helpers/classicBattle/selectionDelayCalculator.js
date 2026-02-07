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

const FALLBACK_SELECTION_READY_DELAY_MS = 50;
const FALLBACK_OPPONENT_MESSAGE_BUFFER_MS = 100;
const DEFAULT_POST_SELECTION_READY_DELAY_MS = 48;

/**
 * Default buffer (in milliseconds) appended after opponent delay messaging
 * when calculating stat-selection readiness timing.
 *
 * @type {number}
 */
export const DEFAULT_OPPONENT_MESSAGE_BUFFER_MS = 150;

/**
 * Get the base selection-ready delay constant.
 * This is the minimum delay before stat selection is considered ready,
 * computed as the maximum of:
 * - DEFAULT_POST_SELECTION_READY_DELAY_MS
 * - DEFAULT_OPPONENT_MESSAGE_BUFFER_MS
 *
 * @returns {number} The base delay in milliseconds
 * @pseudocode
 * 1. Resolve static default timing constants.
 * 2. Return the max of post-selection and opponent-buffer delays.
 * 3. Fall back to 50ms if constants are invalid.
 */
export function getBaseSelectionReadyDelay() {
  const resolvedDelay = Math.max(
    DEFAULT_POST_SELECTION_READY_DELAY_MS,
    DEFAULT_OPPONENT_MESSAGE_BUFFER_MS
  );
  return Number.isFinite(resolvedDelay) && resolvedDelay >= 0
    ? resolvedDelay
    : FALLBACK_SELECTION_READY_DELAY_MS;
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
  if (
    typeof globalThis !== "undefined" &&
    typeof globalThis.__OPPONENT_RESOLVE_DELAY_MS === "number"
  ) {
    return Number(globalThis.__OPPONENT_RESOLVE_DELAY_MS);
  }
  return null;
}

/**
 * Calculate delay including opponent message buffer.
 * Given an opponent delay value, compute the total delay accounting for
 * the configured buffer time after the opponent message.
 *
 * @param {number} opponentDelay - The opponent message delay in milliseconds
 * @param {number} [bufferMs=DEFAULT_OPPONENT_MESSAGE_BUFFER_MS] - Buffer appended to delay
 * @returns {number} The adjusted delay in milliseconds
 * @pseudocode
 * 1. If `opponentDelay` is non-numeric or negative, return 0 immediately.
 * 2. Validate `bufferMs`, falling back to default buffer.
 * 3. Add the buffer to the opponent delay and return the sum.
 */
export function computeDelayWithOpponentBuffer(
  opponentDelay,
  bufferMs = DEFAULT_OPPONENT_MESSAGE_BUFFER_MS
) {
  if (!Number.isFinite(opponentDelay) || opponentDelay < 0) {
    return 0;
  }
  const resolvedBuffer =
    Number.isFinite(bufferMs) && bufferMs >= 0 ? bufferMs : FALLBACK_OPPONENT_MESSAGE_BUFFER_MS;
  return opponentDelay + resolvedBuffer;
}
