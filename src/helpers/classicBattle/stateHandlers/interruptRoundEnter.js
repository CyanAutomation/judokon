import { emitBattleEvent } from "../battleEvents.js";
import { exposeDebugState, readDebugState } from "../debugHooks.js";
import { cleanupInterruptState } from "./interruptStateCleanup.js";
import { debugLog } from "../debugLog.js";

/**
 * onEnter handler for `interruptRound` state.
 *
 * @pseudocode
 * 1. Validate machine parameter to prevent null reference errors.
 * 2. Clean up timers and reset player selection state.
 * 3. Clear scoreboard messages and update debug panel.
 * 4. Cancel decision guard and expose interrupt reason.
 * 5. Route to appropriate next state based on interrupt payload.
 *
 * @param {object} machine - State machine context with store and dispatcher.
 * @param {object} [payload] - Optional transition payload.
 * @param {string} [payload.reason] - Human-readable interrupt reason for display.
 * @param {boolean} [payload.adminTest] - If true, dispatch to roundModification.
 * @returns {Promise<void>}
 */
export async function interruptRoundEnter(machine, payload) {
  if (!machine) {
    debugLog("interruptRoundEnter: invalid machine context");
    return;
  }

  const store = machine.context?.store;

  // Cleanup timers and selection state
  cleanupInterruptState(store);

  // Update UI to reflect interrupted state
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");

  // Cancel round decision guard and expose interrupt reason
  try {
    const fn = readDebugState("roundDecisionGuard");
    if (typeof fn === "function") fn();
    exposeDebugState("roundDecisionGuard", null);
  } catch (err) {
    debugLog("Failed to cancel decision guard:", err);
  }

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

  // Route to appropriate next state
  if (payload?.adminTest) {
    await machine.dispatch("roundModification", payload);
  } else if (payload?.reason === "quit") {
    await machine.dispatch("abortMatch");
  } else {
    await machine.dispatch("restartRound");
  }
}
