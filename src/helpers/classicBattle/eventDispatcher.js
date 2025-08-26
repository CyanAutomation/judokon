let machine = null;

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
    console.log("DEBUG: eventDispatcher dispatch", { eventName, payload });
  } catch {}
  await machine.dispatch(eventName, payload);
  try {
    console.log("DEBUG: eventDispatcher dispatched", { eventName });
  } catch {}
}
