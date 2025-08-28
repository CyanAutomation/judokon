let machine = null;
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

/**
 * Set the state machine instance for the dispatcher.
 * @param {import('./stateMachine.js').BattleStateMachine} m
 */
export function setMachine(m) {
  machine = m;
}

/**
 * Dispatch an event to the state machine.
 * @param {string} eventName
 * @param {any} payload
 */
export async function dispatchBattleEvent(eventName, payload) {
  if (!machine) return;
  try {
    if (!IS_VITEST) console.log("DEBUG: eventDispatcher dispatch", { eventName, payload });
  } catch {}
  await machine.dispatch(eventName, payload);
  try {
    if (!IS_VITEST) console.log("DEBUG: eventDispatcher dispatched", { eventName });
  } catch {}
}
