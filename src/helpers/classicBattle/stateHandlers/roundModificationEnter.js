import { emitBattleEvent } from "../battleEvents.js";

/**
 * onEnter handler for the optional `roundModification` overlay.
 *
 * @param {object} machine
 * @param {object} [payload]
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Clear scoreboard and update debug panel.
 * 2. If payload.modification -> show message.
 * 3. Dispatch `roundPrompt` when `resumeRound`, else `roundWait`.
 */
export async function roundModificationEnter(machine, payload) {
  emitBattleEvent("scoreboardClearMessage");
  emitBattleEvent("debugPanelUpdate");
  if (payload?.modification) {
    emitBattleEvent("scoreboardShowMessage", `Round modified: ${payload.modification}`);
  }
  if (payload?.resumeRound) {
    await machine.dispatch("roundPrompt");
  } else {
    await machine.dispatch("roundWait");
  }
}

export default roundModificationEnter;
