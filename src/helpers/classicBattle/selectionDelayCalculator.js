/**
 * selectionDelayCalculator.js
 *
 * Encapsulates delay calculation logic for stat selection.
 * Computes when stat selection should be considered "ready" based on
 * various timing constraints including opponent message duration and UI buffer times.
 *
 * @pseudocode
 * - Provide functions to calculate selection-ready delays
 * - Account for opponent message duration and buffer times
 * - Support configuration overrides via window object (for testing)
 */

import { CONFIG } from "../config/constants.js";
import { getOpponentDelay } from "./snackbar.js";
import { getOpponentPromptMinDuration } from "./opponentPromptTracker.js";

const BASE_SELECTION_READY_DELAY_MS = Math.max(
  CONFIG.POST_SELECTION_READY_DELAY_MS,
  CONFIG.OPPONENT_MESSAGE_BUFFER_MS
);

/**
 * Calculate the minimum delay before a stat selection is ready.
 * Considers opponent message duration, opponent delay, and configured buffer times.
 *
 * @returns {number} The delay in milliseconds
 */
export function computeSelectionReadyDelay() {
  let delayForReady = BASE_SELECTION_READY_DELAY_MS;
  try {
    const opponentDelay = getOpponentDelay?.();
    if (Number.isFinite(opponentDelay) && opponentDelay >= 0) {
      delayForReady = Math.max(
        delayForReady,
        opponentDelay + CONFIG.OPPONENT_MESSAGE_BUFFER_MS
      );
    }
  } catch {}
  return Math.max(delayForReady, getOpponentPromptMinDuration());
}

/**
 * Get the base selection-ready delay constant.
 * This is the minimum delay before stat selection is considered ready.
 *
 * @returns {number} The base delay in milliseconds
 */
export function getBaseSelectionReadyDelay() {
  return BASE_SELECTION_READY_DELAY_MS;
}

/**
 * Check if a delay override is set via window object (for testing).
 *
 * @returns {number | null} The override delay in milliseconds, or null if not set
 */
export function getSelectionDelayOverride() {
  if (typeof window !== "undefined" && typeof window.__OPPONENT_RESOLVE_DELAY_MS === "number") {
    return Number(window.__OPPONENT_RESOLVE_DELAY_MS);
  }
  return null;
}
