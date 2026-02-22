import { initTurnBasedWait } from "../cooldowns.js";
import { exposeDebugState } from "../debugHooks.js";
import { debugLog } from "../debugLog.js";
import { roundState } from "../roundState.js";
import { disableStatButtons } from "../statButtons.js";
import { guard } from "../guard.js";

/**
 * State name constant for round wait phase.
 * @type {string}
 */
const STATE_ROUND_WAIT = "roundWait";

/**
 * Handler name constant for round wait enter handler.
 * @type {string}
 */
const HANDLER_ROUND_WAIT_ENTER = "roundWaitEnter";

/**
 * Mark roundWaitEnter handler invocation in debug window (test-only).
 *
 * @pseudocode
 * 1. Check if window is available.
 * 2. Set debug flag on globalThis.
 * 3. Silently fail if window unavailable or assignment blocked.
 *
 * @returns {void}
 */
function markDebugRoundWaitEntered() {
  try {
    if (typeof window !== "undefined") {
      window.__roundWaitEnterInvoked = true;
    }
  } catch {}
}

/**
 * Set up debug state for round wait entry (test instrumentation).
 *
 * @pseudocode
 * 1. Log handler invocation with payload info.
 * 2. Mark debug window state.
 * 3. Expose debug state via hook.
 *
 * @param {object} [payload] - Optional transition payload.
 * @returns {void}
 */
function setupDebugState(payload) {
  debugLog("roundWaitEnter: handler invoked", { hasInitialPayload: !!payload?.initial });
  markDebugRoundWaitEntered();
  exposeDebugState("roundWaitEnterInvoked", true);
}

/**
 * Determine whether the current machine is running under the CLI surface.
 *
 * @param {object} machine - State machine context.
 * @returns {boolean} True when surface metadata resolves to CLI.
 */
// isCliSurface removed – the turn-based flow uses the same path for all surfaces.

/**
 * Compute the next round number based on current round.
 *
 * @pseudocode
 * 1. Verify round exists and has numeric number property.
 * 2. Ensure number is finite and >= 1.
 * 3. If not valid, log warning and return 1.
 * 4. Otherwise return current.number + 1.
 *
 * @param {object} currentRound - Current round object.
 * @returns {number} Next round number (>= 1).
 */
function computeNextRoundNumber(currentRound) {
  if (
    !currentRound ||
    typeof currentRound.number !== "number" ||
    !Number.isFinite(currentRound.number) ||
    currentRound.number < 1
  ) {
    debugLog("roundWaitEnter: current round invalid, defaulting next round to 1");
    return 1;
  }
  return currentRound.number + 1;
}

/**
 * Disable stat buttons during the round wait phase to prevent race conditions.
 *
 * @pseudocode
 * 1. Query DOM for stat buttons container if document exists.
 * 2. Extract button elements from container.
 * 3. Use guard utility to safely disable buttons without disrupting flow.
 * 4. Logs errors for diagnostics but never throws.
 *
 * @returns {void}
 */
function disableStatButtonsDuringCooldown() {
  guard(() => {
    if (typeof document === "undefined") return;

    const container = document.getElementById("stat-buttons");
    if (!container) {
      debugLog("roundWaitEnter: stat-buttons container not found");
      return;
    }

    const buttons = Array.from(container.querySelectorAll("button[data-stat]"));
    if (buttons.length === 0) {
      debugLog("roundWaitEnter: no stat buttons found to disable");
      return;
    }

    if (typeof disableStatButtons === "function") {
      disableStatButtons(buttons, container);
      debugLog("roundWaitEnter: disabled stat buttons", { count: buttons.length });
    }
  });
}

/**
 * Safely execute a round store operation with error handling.
 *
 * @pseudocode
 * 1. Combine round state and round number updates into atomic operation.
 * 2. Compute next round number first to ensure validity.
 * 3. Update round store state using constants to prevent typos.
 * 4. Ensures round state consistency.
 *
 * @param {object} round - Current round from store.
 * @returns {void}
 */
function updateRoundStateAtomically(round) {
  const nextRoundNumber = computeNextRoundNumber(round);
  debugLog("roundWaitEnter: updating round state", { nextRoundNumber });
  roundState.setRoundState(STATE_ROUND_WAIT, HANDLER_ROUND_WAIT_ENTER);
  roundState.setRoundNumber(nextRoundNumber);
}

/**
 * onEnter handler for `roundWait` state.
 *
 * @pseudocode
 * 1. Validate machine parameter to prevent null reference errors.
 * 2. Set up debug state.
 * 3. If `payload.initial` -> start match countdown.
 * 4. Otherwise schedule inter-round cooldown.
 * 5. Update round state atomically and compute next round number.
 *
 * @param {object} machine - State machine context with store and scheduler.
 * @param {object} [payload] - Optional transition payload.
 * @param {boolean} [payload.initial] - If true, start match cooldown; otherwise inter-round.
 * @returns {Promise<void>}
 */
export async function roundWaitEnter(machine, payload) {
  if (!machine) {
    debugLog("roundWaitEnter: invalid machine context");
    return;
  }

  setupDebugState(payload);

  // Prevent user interaction with stat buttons during state transition
  disableStatButtonsDuringCooldown();

  // Turn-based flow: both match-start and inter-round wait are driven by
  // the player clicking "Next Round". No timer fires automatically.
  guard(() => {
    updateRoundStateAtomically(roundState.getCurrentRound());
  });

  debugLog("roundWaitEnter: waiting for Next Round button click (turn-based)");
  initTurnBasedWait(machine);
}
