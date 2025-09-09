import { emitBattleEvent } from "../battleEvents.js";

/**
 * onEnter handler for the `matchOver` state.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Emit `matchOver` battle event.
 */
export async function matchOverEnter() {
  emitBattleEvent("matchOver");
}

export default matchOverEnter;
