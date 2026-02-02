import { emitBattleEvent } from "../battleEvents.js";
import { exposeDebugState } from "../debugHooks.js";
import { cleanupInterruptState } from "./interruptStateCleanup.js";
import { cancelRoundResolveGuard } from "./guardCancellation.js";
import { debugLog } from "../debugLog.js";
import { isRoundModificationOverlayEnabled } from "../roundModificationOverlay.js";

/**
 * onEnter handler for `interruptRound` state.
 *
 * Handles round-level interruptions (mid-round abort) by cleaning up state,
 * updating UI, and routing to the appropriate next state based on interrupt reason.
 *
 * @pseudocode
 * 1. Validate machine parameter to prevent null reference errors.
 * 2. Clean up timers and reset player selection state.
 * 3. Cancel round decision guard to prevent duplicate selections.
 * 4. Clear scoreboard messages and update debug panel.
 * 5. Expose interrupt reason for analytics.
 * 6. Route to appropriate next state based on interrupt payload.
 *
 * @param {object} machine - State machine context with store and dispatcher.
 * @param {object} [payload] - Optional transition payload.
 * @param {string} [payload.reason] - Human-readable interrupt reason for display.
 * @param {boolean} [payload.adminTest] - If true and FF_ROUND_MODIFY is enabled, dispatch to the overlay.
 * @param {boolean} [payload.quit] - If true, abort entire match; else restart round.
 * @returns {Promise<void>}
 */
export async function interruptRoundEnter(machine, payload) {
  if (!machine) {
    debugLog("interruptRoundEnter: invalid machine context");
    return;
  }

  const store = machine.context?.store;

  // Cleanup timers and selection state
  cleanupInterruptState(store, { resetSelectionState: true });

  // Cancel round resolve guard to prevent duplicate selections
  cancelRoundResolveGuard();

  // Update UI to reflect interrupted state
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");

  // Expose interrupt reason for analytics
  try {
    exposeDebugState("classicBattleLastInterruptReason", payload?.reason || "");
  } catch (err) {
    debugLog("Failed to expose interrupt reason:", err);
  }

  // Show interrupt message if provided
  if (payload?.reason) {
    emitBattleEvent("scoreboardShowMessage", `Round interrupted: ${payload.reason}`);
  }

  // Route to appropriate next state based on interrupt reason
  if (payload?.adminTest && isRoundModificationOverlayEnabled(machine?.context)) {
    // Admin-initiated test scenario enters the optional overlay
    await machine.dispatch("roundModifyFlag", payload);
  } else if (payload?.reason === "quit") {
    // User quit: abort entire match instead of just this round
    await machine.dispatch("abortMatch");
  } else {
    // Normal interrupt: restart the current round
    await machine.dispatch("restartRound");
  }
}
