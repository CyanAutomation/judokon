import { roundStore } from "./roundStore.js";

let bound = false;
let scoreboardReadyPromise = Promise.resolve();

/**
 * Await the completion of scoreboard adapter wiring.
 *
 * @pseudocode
 * 1. Return the promise tracking the scoreboard wiring lifecycle.
 *
 * @returns {Promise<void>} Resolves once scoreboard integration hooks are ready
 */
export function whenScoreboardReady() {
  return scoreboardReadyPromise;
}

/**
 * Initialize the Scoreboard event adapter.
 *
 * @pseudocode
 * 1. Guard against double-binding.
 * 2. Wire RoundStore into scoreboard for centralized state management.
 * 3. Return a disposer that removes all listeners.
 *
 * @returns {() => void} dispose function to remove listeners
 */
export function initScoreboardAdapter() {
  if (bound) {
    return disposeScoreboardAdapter;
  }
  bound = true;

  scoreboardReadyPromise = Promise.resolve(roundStore.wireIntoScoreboardAdapter());

  return disposeScoreboardAdapter;
}

/**
 * Remove all adapter listeners.
 *
 * @pseudocode
 * 1. Reset RoundStore scoreboard-related callbacks.
 * 2. Clear the bound flag and reset the ready promise.
 * @returns {void}
 */
export function disposeScoreboardAdapter() {
  // Clean up RoundStore integration
  try {
    roundStore.disconnectFromScoreboardAdapter();
  } catch {}

  bound = false;
  scoreboardReadyPromise = Promise.resolve();
}

export default initScoreboardAdapter;
