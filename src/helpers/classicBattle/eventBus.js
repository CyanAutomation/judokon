/**
 * Minimal event bus to decouple state machine dispatch from callers.
 *
 * Avoids circular import TDZ by letting the orchestrator register the
 * dispatcher and state getter once it is initialized.
 */
let dispatcher = async () => {};
let stateGetter = () => null;
let lastBroadcastState = null;

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
  if (typeof fn === "function") {
    stateGetter = fn;
    try {
      if (typeof process !== "undefined" && !!process.env?.VITEST) {
        console.log("[eventBus] setBattleStateGetter called, stateGetter updated");
      }
    } catch {}
  }
}

/**
 * Record the most recent battle state broadcast for fallback access.
 *
 * @pseudocode
 * 1. Ignore non-string or empty inputs.
 * 2. Store the provided battle state for later retrieval.
 *
 * @param {string|null|undefined} state
 * @returns {void}
 */
export function setBattleStateSnapshot(state) {
  if (typeof state === "string" && state.length > 0) {
    lastBroadcastState = state;
  }
}

/**
 * Dispatch a battle event through the registered dispatcher.
 *
 * @pseudocode
 * 1. Invoke the stored `dispatcher` with `eventName` and `payload`.
 * 2. If the dispatcher throws, log the error.
 *
 * @param {string} eventName
 * @param {any} [payload]
 * @returns {Promise<void>} Resolves when the dispatcher completes or is a no-op.
 */
export async function dispatchBattleEvent(eventName, payload) {
  try {
    await dispatcher(eventName, payload);
  } catch (error) {
    console.error(`[eventBus] Failed to dispatch event "${eventName}":`, error);
  }
}

/**
 * Get the current battle state (string) if available.
 *
 * @pseudocode
 * 1. Invoke the stored `stateGetter`.
 * 2. If invocation throws, log the error and return `null`.
 *
 * @returns {string|null}
 */
export function getBattleState() {
  try {
    const result = stateGetter();
    const hasResult = typeof result === "string" && result.length > 0;
    const snapshot = typeof lastBroadcastState === "string" ? lastBroadcastState : null;

    if (hasResult && snapshot && snapshot !== result) {
      return result;
    }

    try {
      if (typeof process !== "undefined" && !!process.env?.VITEST) {
        if (!result) {
          console.log(
            "[eventBus] getBattleState() called, stateGetter returned:",
            result,
            "stateGetter fn is:",
            typeof stateGetter
          );
        }
      }
    } catch {}
    if (hasResult) {
      return result;
    }
    return snapshot;
  } catch (error) {
    console.error(`[eventBus] Failed to get battle state:`, error);
    return typeof lastBroadcastState === "string" ? lastBroadcastState : null;
  }
}

/**
 * Reset the event bus to initial state (for testing purposes).
 *
 * @pseudocode
 * 1. Reset dispatcher to default no-op function.
 * 2. Reset stateGetter to default null-returning function.
 *
 * @returns {void}
 */
export function resetEventBus() {
  dispatcher = async () => {};
  stateGetter = () => null;
  lastBroadcastState = null;
}
