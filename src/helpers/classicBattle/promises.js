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

(() => {
  roundOptionsReadyPromise = setupPromise("roundOptionsReadyPromise", "roundOptionsReady")();
  roundPromptPromise = setupPromise("roundPromptPromise", "roundPrompt")();
  nextRoundTimerReadyPromise = setupPromise("nextRoundTimerReadyPromise", "nextRoundTimerReady")();
  matchOverPromise = setupPromise("matchOverPromise", "matchOver")();
})();
