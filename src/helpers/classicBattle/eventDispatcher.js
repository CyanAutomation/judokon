import { emitBattleEvent } from "./battleEvents.js";

let machine = null;
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

/**
 * Register the active battle state machine.
 *
 * @pseudocode
 * 1. Store the provided machine reference for later dispatches.
 *
 * @param {import('./stateMachine.js').BattleStateMachine} m - Live battle machine.
 */
export function setMachine(m) {
  machine = m;
}

/**
 * Dispatch an event to the registered battle machine.
 *
 * @pseudocode
 * 1. Exit early when no machine is registered.
 * 2. Attempt to dispatch `eventName` with optional `payload` on the machine.
 * 3. If dispatch throws:
 *    a. Swallow the error to prevent cascading failures.
 *    b. Emit `debugPanelUpdate` so UI diagnostics can react.
 *
 * @param {string} eventName - Event to send to the machine.
 * @param {any} [payload] - Optional event payload.
 * @returns {Promise<any>|void} Result of the dispatch when available.
 */
export async function dispatchBattleEvent(eventName, payload) {
  if (!machine) {
    try {
      if (!IS_VITEST) {
        // eslint-disable-next-line no-console
        console.log("DEBUG: eventDispatcher has no machine for", eventName);
      }
    } catch {}
    return;
  }
  try {
    if (!IS_VITEST) {
      // eslint-disable-next-line no-console
      console.log("DEBUG: eventDispatcher dispatch", { state: machine?.getState?.(), eventName, payload });
    }
  } catch {}
  try {
    const res = await machine.dispatch(eventName, payload);
    try {
      if (!IS_VITEST) {
        // eslint-disable-next-line no-console
        console.log("DEBUG: eventDispatcher dispatched", { newState: machine?.getState?.(), eventName });
      }
    } catch {}
    return res;
  } catch {
    try {
      emitBattleEvent("debugPanelUpdate");
    } catch (innerError) {
      if (!IS_VITEST) console.error("Failed to emit debugPanelUpdate event:", innerError);
    }
  }
}
