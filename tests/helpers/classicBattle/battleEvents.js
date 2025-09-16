import { onBattleEvent, offBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";

/**
 * Wait for a single classic battle event and resolve with the dispatched detail.
 *
 * @pseudocode
 * 1. Register an event listener for the provided event name.
 * 2. Start a timeout that rejects if the event does not fire in time.
 * 3. On event, clear the timeout, remove the listener, and resolve with the event detail.
 *
 * @param {string} eventName - Battle event to listen for once.
 * @param {number} [timeout=3000] - Maximum time to wait in milliseconds.
 * @returns {Promise<CustomEvent>} Resolves with the captured event.
 */
export function waitForBattleEventOnce(eventName, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      offBattleEvent(eventName, handler);
      reject(new Error(`timeout waiting for ${eventName}`));
    }, timeout);

    const handler = (event) => {
      clearTimeout(timer);
      offBattleEvent(eventName, handler);
      resolve(event);
    };

    onBattleEvent(eventName, handler);
  });
}
