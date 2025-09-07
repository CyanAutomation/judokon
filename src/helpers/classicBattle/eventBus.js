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
 *
 * @pseudocode
 * 1. If `fn` is a function, store it in `dispatcher`.
 * 2. `dispatchBattleEvent` will later invoke this stored dispatcher.
 *
 * @param {(eventName: string, payload?: any) => Promise<void>|void} fn
 * @returns {void}
 */
export function setBattleDispatcher(fn) {
  if (typeof fn === "function") dispatcher = fn;
}

/**
 * Register a getter that returns the current battle state name.
 *
 * @pseudocode
 * 1. If `fn` is a function, store it in `stateGetter`.
 * 2. `getBattleState` will later use this stored getter.
 *
 * @param {() => string|null} fn
 * @returns {void}
 */
export function setBattleStateGetter(fn) {
  if (typeof fn === "function") stateGetter = fn;
}

/**
 * Dispatch a battle event through the registered dispatcher.
 *
 * @pseudocode
 * 1. Invoke the stored `dispatcher` with `eventName` and `payload`.
 * 2. If the dispatcher throws, swallow the error.
 *
 * @param {string} eventName
 * @param {any} [payload]
 * @returns {Promise<void>} Resolves when the dispatcher completes or is a no-op.
 */
export async function dispatchBattleEvent(eventName, payload) {
  try {
    await dispatcher(eventName, payload);
  } catch {
    // Swallow dispatcher errors to keep battle flow
  }
}

/**
 * Get the current battle state (string) if available.
 *
 * @pseudocode
 * 1. Invoke the stored `stateGetter`.
 * 2. If invocation throws, swallow the error and return `null`.
 *
 * @returns {string|null}
 */
export function getBattleState() {
  try {
    return stateGetter();
  } catch {
    // Swallow getter errors; state is unknown
    return null;
  }
}
