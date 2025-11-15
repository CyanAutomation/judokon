import { emitBattleEvent } from "../battleEvents.js";
import { cleanupInterruptState } from "./interruptStateCleanup.js";
import { debugLog } from "../debugLog.js";

/**
 * onEnter handler for `interruptMatch` state.
 *
 * @pseudocode
 * 1. Validate machine parameter to prevent null reference errors.
 * 2. Clean up timers and reset player selection state.
 * 3. Clear scoreboard and update debug panel.
 * 4. Show interrupt message when reason provided.
 * 5. Dispatch `toLobby` to return to main menu.
 *
 * @param {object} machine - State machine context with store and dispatcher.
 * @param {object} [payload] - Optional transition payload.
 * @param {string} [payload.reason] - Human-readable interrupt reason for display.
 * @returns {Promise<void>}
 */
export async function interruptMatchEnter(machine, payload) {
  if (!machine) {
    debugLog("interruptMatchEnter: invalid machine context");
    return;
  }

  // Cleanup timers and selection state
  const store = machine.context?.store;
  cleanupInterruptState(store);

  // Update UI to reflect interrupted state
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");

  // Show interrupt reason if provided
  if (payload?.reason) {
    emitBattleEvent("scoreboardShowMessage", `Match interrupted: ${payload.reason}`);
  }

  // Transition back to lobby
  await machine.dispatch("toLobby", payload);
}
