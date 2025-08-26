/**
 * Battle event dispatcher.
 *
 * @pseudocode
 * 1. Maintain a reference to the active state machine and a list of pending events.
 * 2. Allow other modules to set the machine instance using `setMachine` which flushes pending events.
 * 3. Provide `dispatchBattleEvent(event, payload)` to forward events to the machine or queue them until it is set.
 */
let machine = null;
let pendingEvents = [];

/**
 * Set the state machine instance for the dispatcher.
 * @param {import('./stateMachine.js').BattleStateMachine} m
 */
export function setMachine(m) {
  machine = m;
  if (!machine) return;
  const events = pendingEvents;
  pendingEvents = [];
  for (const { eventName, payload, resolve, reject } of events) {
    machine.dispatch(eventName, payload).then(resolve, reject);
  }
}

/**
 * Dispatch an event to the state machine.
 * @param {string} eventName
 * @param {any} payload
 */
export function dispatchBattleEvent(eventName, payload) {
  if (!machine) {
    return new Promise((resolve, reject) => {
      pendingEvents.push({ eventName, payload, resolve, reject });
    });
  }
  return machine.dispatch(eventName, payload);
}
