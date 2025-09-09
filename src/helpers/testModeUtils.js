/**
 * Utilities for deterministic Test Mode behaviour.
 *
 * @pseudocode
 * 1. Track whether test mode is active and a numeric seed.
 * 2. When active, `seededRandom()` returns a predictable pseudo-random number.
 * 3. Provide helpers to enable/disable test mode and query current state.
 *
 * `computeNextRoundCooldown` logs the resolved cooldown with a `[test]` prefix
 * when Test Mode is enabled. Override the cooldown for manual testing by
 * setting `window.__NEXT_ROUND_COOLDOWN_MS`.
 */
let active = false;
let seed = 1;

/**
 * Enable or disable deterministic test mode.
 *
 * @pseudocode
 * if input is object:
 *   active = Boolean(input.enabled)
 *   seed = Number(input.seed) or 1
 * else:
 *   active = Boolean(enable)
 *   seed = initialSeed or 1
 */
/**
 * Enable or disable deterministic Test Mode.
 *
 * When enabled, `seededRandom()` becomes deterministic using an internal
 * numeric seed. Callers may pass either a boolean or an options object.
 *
 * @pseudocode
 * if input is object:
 *   active = Boolean(input.enabled)
 *   seed = Number(input.seed) or 1
 * else:
 *   active = Boolean(enable)
 *   seed = initialSeed or 1
 *
 * @param {boolean|{enabled?: boolean, seed?: number}} enableOrOptions - Flag or options object.
 * @param {number} [initialSeed=1] - Seed to use when a boolean flag is passed.
 * @returns {void}
 */
export function setTestMode(enableOrOptions, initialSeed = 1) {
  if (typeof enableOrOptions === "object") {
    active = Boolean(enableOrOptions.enabled);
    seed = Number(enableOrOptions.seed) || 1;
  } else {
    active = Boolean(enableOrOptions);
    seed = initialSeed;
  }

  // Set global flag for other modules to detect test mode
  if (typeof window !== "undefined") {
    window.__testMode = active;
  }
}

/**
 * Check whether deterministic Test Mode is active.
 *
 * @pseudocode
 * 1. Return the current boolean flag that indicates Test Mode activation.
 *
 * @returns {boolean} True when test mode is enabled.
 */
/**
 * Check whether deterministic Test Mode is active.
 *
 * @pseudocode
 * 1. Return the current boolean flag that indicates Test Mode activation.
 *
 * @returns {boolean} True when test mode is enabled.
 */
export function isTestModeEnabled() {
  return active;
}

/**
 * Produce a deterministic pseudo-random number when Test Mode is enabled.
 *
 * @pseudocode
 * 1. If Test Mode is not active, return Math.random().
 * 2. Otherwise compute x = sin(seed) * 10000, increment the seed, and
 *    return the fractional part of x (x - floor(x)).
 *
 * @returns {number} A number in the range [0, 1).
 */
export function seededRandom() {
  if (!active) return Math.random();
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Retrieve the current numeric seed used by the deterministic RNG.
 *
 * @pseudocode
 * 1. Return the internal `seed` value used by `seededRandom()`.
 *
 * @returns {number} The current seed.
 */
export function getCurrentSeed() {
  return seed;
}
