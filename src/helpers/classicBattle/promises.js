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
export function resetBattlePromises() {
  roundOptionsReadyPromise = setupPromise("roundOptionsReadyPromise", "roundOptionsReady")();
  roundPromptPromise = setupPromise("roundPromptPromise", "roundPrompt")();
  nextRoundTimerReadyPromise = setupPromise("nextRoundTimerReadyPromise", "nextRoundTimerReady")();
  matchOverPromise = setupPromise("matchOverPromise", "matchOver")();
  countdownStartedPromise = setupPromise("countdownStartedPromise", "nextRoundCountdownStarted")();
  roundTimeoutPromise = setupPromise("roundTimeoutPromise", "roundTimeout")();
  statSelectionStalledPromise = setupPromise(
    "statSelectionStalledPromise",
    "statSelectionStalled"
  )();
  roundResolvedPromise = setupPromise("roundResolvedPromise", "roundResolved")();
}

// Initialize on module load
resetBattlePromises();

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
export const getStatSelectionStalledPromise = () =>
  latest("statSelectionStalledPromise", statSelectionStalledPromise);
