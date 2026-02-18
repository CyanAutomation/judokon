import { offBattleEvent, onBattleEvent } from "./battleEvents.js";

const promiseSubscriptionRegistry = new Map();

function getSubscriptionKey(key, eventName) {
  return `${key}:${eventName}`;
}

function removePromiseSubscription(subscriptionKey) {
  const subscription = promiseSubscriptionRegistry.get(subscriptionKey);
  if (!subscription) return;
  subscription.teardown();
  promiseSubscriptionRegistry.delete(subscriptionKey);
}

function clearPromiseSubscriptions() {
  for (const subscriptionKey of promiseSubscriptionRegistry.keys()) {
    removePromiseSubscription(subscriptionKey);
  }
}

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
 * @returns {{getPromise: () => Promise<void>, teardown: () => void}} Promise getter and teardown.
 */
function setupPromise(key, eventName) {
  const subscriptionKey = getSubscriptionKey(key, eventName);
  removePromiseSubscription(subscriptionKey);

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

  const handler = () => {
    try {
      try {
        window.__promiseEvents = window.__promiseEvents || [];
        window.__promiseEvents.push({ type: "promise-resolve", key, ts: Date.now() });
      } catch {}
      if (typeof window !== "undefined") window[`__resolved_${key}`] = true;
      resolve();
    } catch {}
    promise = reset();
  };

  onBattleEvent(eventName, handler);
  const teardown = () => offBattleEvent(eventName, handler);
  promiseSubscriptionRegistry.set(subscriptionKey, { teardown });
  return { getPromise: () => promise, teardown };
}

export let roundOptionsReadyPromise;
export let roundPromptPromise;
export let nextRoundTimerReadyPromise;
export let matchOverPromise;
export let countdownStartedPromise;
export let roundTimeoutPromise;
export let statSelectionStalledPromise;
export let roundEvaluatedPromise;

/**
 * @summary Reset and initialize the suite of battle event promises used by tests.
 * @pseudocode
 * 1. For each tracked battle lifecycle event, call `setupPromise(key, eventName)`.
 * 2. Immediately invoke the returned getter to store the active Promise in the export.
 * 3. Allow consumers to await the exported promises or getter helpers for synchronization.
 *
 * @returns {void}
 */
export function resetBattlePromises() {
  clearPromiseSubscriptions();

  roundOptionsReadyPromise = setupPromise("roundOptionsReadyPromise", "roundOptionsReady").getPromise();
  roundPromptPromise = setupPromise("roundPromptPromise", "roundPrompt").getPromise();
  nextRoundTimerReadyPromise = setupPromise(
    "nextRoundTimerReadyPromise",
    "nextRoundTimerReady"
  ).getPromise();
  matchOverPromise = setupPromise("matchOverPromise", "matchOver").getPromise();
  countdownStartedPromise = setupPromise(
    "countdownStartedPromise",
    "nextRoundCountdownStarted"
  ).getPromise();
  roundTimeoutPromise = setupPromise("roundTimeoutPromise", "roundTimeout").getPromise();
  statSelectionStalledPromise = setupPromise(
    "statSelectionStalledPromise",
    "statSelectionStalled"
  ).getPromise();
  roundEvaluatedPromise = setupPromise("roundEvaluatedPromise", "round.evaluated").getPromise();
}

// Return the latest promise instance for each awaitable, using the window-scoped
// reference maintained by setupPromise(). This avoids races where a module-level
// Promise was already resolved before the test started awaiting it.
/**
 * Get the latest promise instance for a key, avoiding race conditions.
 *
 * @param {string} key - The promise key.
 * @param {Promise} fallback - Fallback promise if window-scoped promise unavailable.
 * @returns {Promise} The latest promise instance or resolved promise if already resolved.
 * @summary Return the most current promise instance to avoid race conditions in tests.
 * @pseudocode
 * 1. Check if the promise has already been resolved via window marker.
 * 2. Return resolved promise immediately if already resolved.
 * 3. Return window-scoped promise if available.
 * 4. Fall back to module-level promise.
 */
function latest(key, fallback) {
  if (typeof window !== "undefined") {
    if (window[`__resolved_${key}`]) return Promise.resolve();
    if (window[key] instanceof Promise) return window[key];
  }
  return fallback;
}

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
 * Return a Promise that resolves on the next `round.evaluated` event.
 *
 * @pseudocode
 * 1. If the resolved marker is set on window, return Promise.resolve().
 * 2. If a window-scoped promise exists, return it.
 * 3. Otherwise return the module-level fallback promise.
 *
 * @returns {Promise<void>} Promise resolved when a round has been evaluated.
 */
export const getRoundEvaluatedPromise = () =>
  latest("roundEvaluatedPromise", roundEvaluatedPromise);
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
