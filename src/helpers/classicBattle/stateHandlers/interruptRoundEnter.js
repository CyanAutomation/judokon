import { emitBattleEvent } from "../battleEvents.js";
import { exposeDebugState, readDebugState } from "../debugHooks.js";

/**
 * onEnter handler for `interruptRound`.
 *
 * @param {object} machine
 * @param {object} [payload]
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear scoreboard messages and update debug panel.
 * 2. Reset selection state and cancel decision guard.
 * 3. Expose last interrupt reason.
 * 4. If `adminTest` -> dispatch `roundModification`, else `restartRound`.
 */
export async function interruptRoundEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  try {
    const store = machine?.context?.store;
    if (store) {
      store.playerChoice = null;
      store.selectionMade = false;
    }
    const fn = readDebugState("roundDecisionGuard");
    if (typeof fn === "function") fn();
    exposeDebugState("roundDecisionGuard", null);
  } catch {}
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
