/**
 * Waits for the Node.js event loop to emit any queued `unhandledRejection` events.
 *
 * Although similar to {@link flushMicrotasks}, unhandled rejections are surfaced on
 * the `nextTick` queue rather than the microtask queue. Separating the helper
 * makes this distinction explicit so callers choose the correct timing primitive.
 *
 * @pseudocode
 * 1. Create a promise that resolves on the next event loop tick via `process.nextTick`.
 * 2. Await the promise to allow the `unhandledRejection` event to fire.
 *
 * @returns {Promise<void>} Resolves after the next event loop tick.
 */
export function flushUnhandledRejections() {
  return new Promise((resolve) => {
    process.nextTick(resolve);
  });
}
