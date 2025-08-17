/**
 * Minimal event bus to decouple state machine dispatch from callers.
 *
 * Avoids circular import TDZ by letting the orchestrator register the
 * dispatcher and state getter once it is initialized.
 */
let dispatcher = async () => {};
let stateGetter = () => null;

/**
 * Register the event dispatcher used for battle state transitions.
 * @param {(eventName: string, payload?: any) => Promise<void>|void} fn
 */
export function setBattleDispatcher(fn) {
  if (typeof fn === "function") dispatcher = fn;
}

/**
 * Register a getter that returns the current battle state name.
 * @param {() => string|null} fn
 */
export function setBattleStateGetter(fn) {
  if (typeof fn === "function") stateGetter = fn;
}

/**
 * Dispatch a battle event through the registered dispatcher.
 * @param {string} eventName
 * @param {any} [payload]
 */
export async function dispatchBattleEvent(eventName, payload) {
  try {
    await dispatcher(eventName, payload);
  } catch {}
}

/**
 * Get the current battle state (string) if available.
 * @returns {string|null}
 */
export function getBattleState() {
  try {
    return stateGetter();
  } catch {
    return null;
  }
}
