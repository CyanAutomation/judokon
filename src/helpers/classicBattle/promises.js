import { onBattleEvent } from "./battleEvents.js";

/**
 * Create a self-resetting promise tied to a battle event.
 *
 * @pseudocode
 * 1. Define a `reset` function that assigns a new Promise and exposes it on `window`.
 * 2. Resolve the current promise when the specified event fires.
 * 3. After resolving, call `reset()` to prepare for the next event.
 *
 * @param {string} key - Global name for the promise.
 * @param {string} eventName - Battle event to listen for.
 * @returns {() => Promise<void>} Function returning the current promise.
 */
function setupPromise(key, eventName) {
  let resolve;
  function reset() {
    const p = new Promise((r) => {
      resolve = r;
    });
    try {
      if (typeof window !== "undefined") {
        window[key] = p;
        window[`__resolved_${key}`] = false;
        try {
          window.__promiseEvents = window.__promiseEvents || [];
          window.__promiseEvents.push({ type: "promise-reset", key, ts: Date.now() });
        } catch {}
      }
    } catch {}
    return p;
  }
  let promise = reset();
  onBattleEvent(eventName, () => {
    try {
      try {
        window.__promiseEvents = window.__promiseEvents || [];
        window.__promiseEvents.push({ type: "promise-resolve", key, ts: Date.now() });
      } catch {}
      if (typeof window !== "undefined") window[`__resolved_${key}`] = true;
      resolve();
    } catch {}
    promise = reset();
  });
  return () => promise;
}

export let roundOptionsReadyPromise;
export let roundPromptPromise;
export let nextRoundTimerReadyPromise;
export let matchOverPromise;
export let countdownStartedPromise;
export let roundTimeoutPromise;
export let statSelectionStalledPromise;
export let roundResolvedPromise;

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Initialize and reset the suite of test-friendly battle promises.
 *
 * These promises are created with `setupPromise()` which attaches a window-
 * scoped reference and automatically re-creates a fresh Promise each time the
 * corresponding battle event fires. Tests (and runtime helpers) can await the
 * returned getters to synchronize with UI and state transitions.
 *
 * @pseudocode
 * 1. For each well-known battle lifecycle event, call `setupPromise(key, event)`
 *    to create a self-resetting Promise and assign it to the exported symbol.
 * 2. Ensure the created Promise is the active one by invoking the returned
 *    function (which returns the current Promise instance).
 * 3. Caller code and tests should use the provided getters (e.g. `getRoundPromptPromise`) to
 *    obtain the latest Promise instance, avoiding races with module-level resolved Promises.
 *
 * @returns {void}
 */
export function resetBattlePromises() {
  roundOptionsReadyPromise = setupPromise("roundOptionsReadyPromise", "roundOptionsReady")();
  roundPromptPromise = setupPromise("roundPromptPromise", "roundPrompt")();
  nextRoundTimerReadyPromise = setupPromise("nextRoundTimerReadyPromise", "nextRoundTimerReady")();
  matchOverPromise = setupPromise("matchOverPromise", "matchOver")();
  countdownStartedPromise = setupPromise("countdownStartedPromise", "control.countdown.started")();
  roundTimeoutPromise = setupPromise("roundTimeoutPromise", "roundTimeout")();
  statSelectionStalledPromise = setupPromise(
    "statSelectionStalledPromise",
    "statSelectionStalled"
  )();
  roundResolvedPromise = setupPromise("roundResolvedPromise", "roundResolved")();
}

// Initialize on module load once per worker to avoid accumulating listeners
try {
  const FLAG = "__classicBattlePromisesBound";
  if (!globalThis[FLAG]) {
    resetBattlePromises();
    globalThis[FLAG] = true;
  }
} catch {
  resetBattlePromises();
}

// Return the latest promise instance for each awaitable, using the window-scoped
// reference maintained by setupPromise(). This avoids races where a module-level
// Promise was already resolved before the test started awaiting it.
function latest(key, fallback) {
  if (typeof window !== "undefined") {
    if (window[`__resolved_${key}`]) return Promise.resolve();
    if (window[key] instanceof Promise) return window[key];
  }
  return fallback;
}

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Return a Promise that resolves when the next `roundPrompt` battle event fires.
 *
 * This returns the window-scoped promise instance created by `resetBattlePromises()`
 * or resolves immediately if the event has already been observed.
 *
 * @pseudocode
 * 1. If `window.__resolved_roundPromptPromise` is true, return an already-resolved Promise.
 * 2. If `window.roundPromptPromise` is a Promise, return it.
 * 3. Otherwise return the module-level `roundPromptPromise` fallback.
 *
 * @returns {Promise<void>} Promise resolved on next `roundPrompt` event.
 */
export const getRoundPromptPromise = () => latest("roundPromptPromise", roundPromptPromise);
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Return a Promise that resolves when the next `nextRoundCountdownStarted` event fires.
 *
 * See `getRoundPromptPromise` for the getter semantics and race avoidance.
 *
 * @pseudocode
 * 1. Check `window.__resolved_countdownStartedPromise` for an immediate resolve.
 * 2. Return `window.countdownStartedPromise` when available, otherwise use module fallback.
 *
 * @returns {Promise<void>} Promise resolved when countdown starts.
 */
export const getCountdownStartedPromise = () =>
  latest("countdownStartedPromise", countdownStartedPromise);
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Return a Promise that resolves on the next `roundResolved` event.
 *
 * @pseudocode
 * 1. If the resolved marker is set on window, return Promise.resolve().
 * 2. If a window-scoped promise exists, return it.
 * 3. Otherwise return the module-level fallback promise.
 *
 * @returns {Promise<void>} Promise resolved when a round has been resolved.
 */
export const getRoundResolvedPromise = () => latest("roundResolvedPromise", roundResolvedPromise);
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Return a Promise that resolves when a `roundTimeout` event occurs.
 *
 * @pseudocode
 * 1. If `window.__resolved_roundTimeoutPromise` is set, return a resolved Promise.
 * 2. Otherwise return the window-scoped promise or module fallback.
 *
 * @returns {Promise<void>} Promise resolved when the round times out.
 */
export const getRoundTimeoutPromise = () => latest("roundTimeoutPromise", roundTimeoutPromise);
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Return a Promise that resolves when the `statSelectionStalled` event is emitted.
 *
 * Useful for tests that want to await the UI stall prompt or auto-selection.
 *
 * @pseudocode
 * 1. Check for the window-scoped resolved marker and return resolved Promise if present.
 * 2. Return `window.statSelectionStalledPromise` when available, otherwise fallback to module value.
 *
 * @returns {Promise<void>} Promise resolved when stat selection is considered stalled.
 */
export const getStatSelectionStalledPromise = () =>
  latest("statSelectionStalledPromise", statSelectionStalledPromise);
