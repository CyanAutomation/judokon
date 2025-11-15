import { emitBattleEvent } from "../battleEvents.js";

/**
 * onExit handler for `waitingForPlayerAction` state.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Disable stat buttons.
 */
export async function waitingForPlayerActionExit() {
  try {
    if (typeof window !== "undefined" && window.console && window.console.debug) {
      window.console.debug("[waitingForPlayerActionExit] emitting statButtons:disable");
    }
  } catch {}
  emitBattleEvent("statButtons:disable");
}

export default waitingForPlayerActionExit;
