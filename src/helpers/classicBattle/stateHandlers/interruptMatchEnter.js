import { emitBattleEvent } from "../battleEvents.js";
import { cleanupTimers } from "../selectionHandler.js";

/**
 * onEnter handler for `interruptMatch`.
 *
 * @param {object} machine
 * @param {object} [payload]
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear any running timers to prevent stale callbacks.
 * 2. Teardown match context by resetting store state.
 * 3. Clear scoreboard and update debug panel.
 * 4. Show interrupt message when reason provided.
 * 5. Dispatch `toLobby` with payload.
 */
export async function interruptMatchEnter(machine, payload) {
  // timer:clearIfRunning - Clear any running timers to prevent stale callbacks
  const store = machine?.context?.store;
  if (store) {
    try {
      cleanupTimers(store);
    } catch (err) {
      console.debug("Timer cleanup failed during match interrupt:", err);
    }
  }

  // teardown:matchContext - Reset store state for match cleanup
  if (store) {
    try {
      store.playerChoice = null;
      store.selectionMade = false;
      // Additional match context cleanup could be added here
    } catch {}
  }

  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  
  // log:analyticsInterruptMatch - Show interrupt message when reason provided
  if (payload?.reason) {
    emitBattleEvent("scoreboardShowMessage", `Match interrupted: ${payload.reason}`);
  }
  
  await machine.dispatch("toLobby", payload);
}

export default interruptMatchEnter;
