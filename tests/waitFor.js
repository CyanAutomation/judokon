import { expect } from "vitest";

/**
 * Waits until the provided predicate returns `true`.
 *
 * Uses `expect.poll` so callers can rely on fake timers instead of real
 * delays. The returned promise rejects if the predicate never returns `true`
 * within the timeout.
 *
 * @pseudocode
 * initialize polling via `expect.poll`
 * repeatedly evaluate predicate
 * resolve on success
 * reject after timeout
 *
 * @param {() => boolean} predicate - Condition to repeatedly evaluate.
 * @param {object} [options] - Configuration options.
 * @param {number} [options.timeout=500] - Maximum time to wait in milliseconds.
 * @param {number} [options.interval=10] - Polling interval in milliseconds.
 * @returns {Promise<void>} Resolves when the predicate is satisfied.
 */
export async function waitFor(predicate, { timeout = 500, interval = 10 } = {}) {
  await expect.poll(() => predicate() === true, { timeout, interval }).toBe(true);
}
