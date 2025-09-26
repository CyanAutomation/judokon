/**
 * Flushes pending microtasks to ensure async DOM updates settle before assertions.
 *
 * @pseudocode
 * 1. Normalize the iteration count to a safe integer >= 1
 * 2. Await Promise.resolve() for the requested number of iterations
 * 3. Each await processes the current microtask queue
 *
 * @param {number} [iterations=1] Number of event loop microtask turns to await
 * @returns {Promise<void>} Resolves once the requested microtask turns are processed
 */
export async function flushMicrotasks(iterations = 1) {
  const total = Number.isFinite(iterations) && iterations > 0 ? Math.ceil(iterations) : 1;
  for (let remaining = total; remaining > 0; remaining -= 1) {
    await Promise.resolve();
  }
}
