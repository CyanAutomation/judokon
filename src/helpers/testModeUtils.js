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
export function setTestMode(enableOrOptions, initialSeed = 1) {
  if (typeof enableOrOptions === "object") {
    active = Boolean(enableOrOptions.enabled);
    seed = Number(enableOrOptions.seed) || 1;
  } else {
    active = Boolean(enableOrOptions);
    seed = initialSeed;
  }
}

/**
 * Check whether deterministic test mode is active.
 *
 * @pseudocode
 * return active
 */
export function isTestModeEnabled() {
  return active;
}

/**
 * Return a pseudo-random number.
 *
 * @pseudocode
 * if not active: return Math.random()
 * x = sin(seed) * 10000
 * seed += 1
 * return fractional part of x
 */
export function seededRandom() {
  if (!active) return Math.random();
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Get the current seed value.
 *
 * @pseudocode
 * return seed
 */
export function getCurrentSeed() {
  return seed;
}
