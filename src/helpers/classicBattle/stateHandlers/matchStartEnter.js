import { debugLog } from "../debugLog.js";

/**
 * onEnter handler for `matchStart` state.
 *
 * @param {object} machine - State machine instance.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Dispatch `ready` with `{ initial: true }` to advance.
 */
export async function matchStartEnter(machine) {
  debugLog("matchStartEnter() called");
  await machine.dispatch("ready", { initial: true });
}

export default matchStartEnter;
