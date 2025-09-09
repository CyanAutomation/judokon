import { emitBattleEvent } from "../battleEvents.js";

/**
 * onEnter handler for `roundModification`.
 *
 * @param {object} machine
 * @param {object} [payload]
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear scoreboard and update debug panel.
 * 2. If payload.modification -> show message.
 * 3. Dispatch `roundStart` when `resumeRound`, else `cooldown`.
 */
export async function roundModificationEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  if (payload?.modification) {
    emitBattleEvent("scoreboardShowMessage", `Round modified: ${payload.modification}`);
  }
  if (payload?.resumeRound) {
    await machine.dispatch("roundStart");
  } else {
    await machine.dispatch("cooldown");
  }
}

export default roundModificationEnter;
