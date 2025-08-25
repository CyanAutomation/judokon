/**
 * Small scheduler abstraction used by helpers to allow test injection.
 *
 * @pseudocode
 * 1. Provide `setTimeout` and `clearTimeout` methods wired to the platform timers.
 * 2. Tests can swap in a mock scheduler when deterministic control is required.
 */
export const realScheduler = {
  setTimeout: (cb, ms) => setTimeout(cb, ms),
  clearTimeout: (id) => clearTimeout(id)
};
