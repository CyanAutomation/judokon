import { emitBattleEvent } from "../battleEvents.js";
import { exposeDebugState, readDebugState } from "../debugHooks.js";
import { cleanupTimers } from "../selectionHandler.js";

/**
 * onEnter handler for `interruptRound`.
 *
 * @param {object} machine
 * @param {object} [payload]
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear running timers to prevent stale callbacks.
 * 2. Clear scoreboard messages and update debug panel.
 * 3. Reset selection state and cancel decision guard.
 * 4. Expose last interrupt reason.
 * 5. If `adminTest` -> dispatch `roundModification`, else `restartRound`.
 */
export async function interruptRoundEnter(machine, payload) {
  // timer:clearIfRunning - Clear any running timers to prevent stale callbacks
  const store = machine?.context?.store;
  if (store) {
    try {
      cleanupTimers(store);
    } catch (err) {
      console.debug("Timer cleanup failed during round interrupt:", err);
    }
  }

  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  
  // rollback:roundContextIfNeeded - Reset selection state and cancel decision guard
  try {
    if (store) {
      store.playerChoice = null;
      store.selectionMade = false;
    }
    const fn = readDebugState("roundDecisionGuard");
    if (typeof fn === "function") fn();
    exposeDebugState("roundDecisionGuard", null);
  } catch {}
  
  // log:analyticsInterruptRound - Expose interrupt reason for analytics
  try {
    exposeDebugState("classicBattleLastInterruptReason", payload?.reason || "");
  } catch {}
  
  if (payload?.reason) {
    emitBattleEvent("scoreboardShowMessage", `Round interrupted: ${payload.reason}`);
  }
  if (payload?.adminTest) {
    await machine.dispatch("roundModification", payload);
  } else {
    await machine.dispatch("restartRound");
  }
}

export default interruptRoundEnter;
