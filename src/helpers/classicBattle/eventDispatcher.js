/**
 * Battle event dispatcher.
 *
 * @pseudocode
 * 1. Maintain a reference to the active state machine.
 * 2. Allow other modules to set the machine instance using `setMachine`.
 * 3. Provide `dispatchBattleEvent(event, payload)` to forward events to the machine.
 */
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
  await machine.dispatch(eventName, payload);
}
