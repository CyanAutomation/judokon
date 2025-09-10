import { emitBattleEvent } from "../battleEvents.js";

/**
 * onEnter handler for `waitingForPlayerAction` state.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Enable stat buttons via battle event.
 */
export async function waitingForPlayerActionEnter() {
  emitBattleEvent("statButtons:enable");
}

export default waitingForPlayerActionEnter;