let machine = null;
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

/**
 * Register the battle state machine instance used by this dispatcher.
 *
 * @param {import('./stateMachine.js').BattleStateMachine} m
 * @pseudocode
 * 1. Store the provided machine instance in module-scope `machine`.
 * 2. Later `dispatchBattleEvent` will call `machine.dispatch` if present.
 */
export function setMachine(m) {
  machine = m;
}

/**
 * Dispatch an event to the registered state machine.
 *
 * @param {string} eventName
 * @param {any} payload
 * @pseudocode
 * 1. If no `machine` is registered, exit early.
 * 2. Optionally log debug information when not running in Vitest.
 * 3. Call `machine.dispatch(eventName, payload)` and await completion.
 * 4. Optionally log completion when not running in Vitest.
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
