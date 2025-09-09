import { emitBattleEvent } from "../battleEvents.js";

/**
 * onExit handler for `waitingForPlayerAction` state.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Disable stat buttons.
 */
export async function waitingForPlayerActionExit() {
  emitBattleEvent("statButtons:disable");
}

export default waitingForPlayerActionExit;
