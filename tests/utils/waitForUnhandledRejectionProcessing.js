/**
 * Waits for the Node.js event loop to emit any queued `unhandledRejection` events.
 *
 * @pseudocode
 * 1. Create a promise that resolves on the next event loop tick via `process.nextTick`.
 * 2. Await the promise to allow the `unhandledRejection` event to fire.
 *
 * @returns {Promise<void>} Resolves after the next event loop tick.
 */
export function waitForUnhandledRejectionProcessing() {
  return new Promise((resolve) => {
    process.nextTick(resolve);
  });
}
