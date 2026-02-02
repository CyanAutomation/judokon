import { emitBattleEvent } from "../battleEvents.js";

/**
 * onExit handler for `roundSelect` state.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Disable stat buttons.
 */
export async function roundSelectExit() {
  try {
    if (typeof window !== "undefined" && window.console && window.console.debug) {
      window.console.debug("[roundSelectExit] emitting statButtons:disable");
    }
  } catch {}
  emitBattleEvent("statButtons:disable");
}

export default roundSelectExit;
