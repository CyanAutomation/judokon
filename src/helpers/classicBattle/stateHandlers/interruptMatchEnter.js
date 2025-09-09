import { emitBattleEvent } from "../battleEvents.js";

/**
 * onEnter handler for `interruptMatch`.
 *
 * @param {object} machine
 * @param {object} [payload]
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear scoreboard and update debug panel.
 * 2. Show interrupt message when reason provided.
 * 3. Dispatch `toLobby` with payload.
 */
export async function interruptMatchEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  if (payload?.reason) {
    emitBattleEvent("scoreboardShowMessage", `Match interrupted: ${payload.reason}`);
  }
  await machine.dispatch("toLobby", payload);
}

export default interruptMatchEnter;
