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
 *
 * @pseudocode
 * 1. Verify that `fn` is a function.
 * 2. When valid, assign it to `dispatcher`.
 */
export function setBattleDispatcher(fn) {
  if (typeof fn === "function") dispatcher = fn;
}

/**
 * Register a getter that returns the current battle state name.
 * @param {() => string|null} fn
 *
 * @pseudocode
 * 1. Check that `fn` is a function.
 * 2. When valid, assign it to `stateGetter`.
 */
export function setBattleStateGetter(fn) {
  if (typeof fn === "function") stateGetter = fn;
}

/**
 * Dispatch a battle event through the registered dispatcher.
 * @param {string} eventName
 * @param {any} [payload]
 *
 * @pseudocode
 * 1. Call the stored `dispatcher` with `eventName` and `payload`.
 * 2. Swallow any errors from the dispatcher.
 */
export async function dispatchBattleEvent(eventName, payload) {
  try {
    await dispatcher(eventName, payload);
  } catch {}
}

/**
 * Get the current battle state (string) if available.
 * @returns {string|null}
 *
 * @pseudocode
 * 1. Invoke the stored `stateGetter` and return its value.
 * 2. On error, return `null`.
 */
export function getBattleState() {
  try {
    return stateGetter();
  } catch {
    return null;
  }
}
