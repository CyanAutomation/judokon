/**
 * Utilities for deterministic Test Mode behaviour.
 *
 * @pseudocode
 * 1. Track whether test mode is active and a numeric seed.
 * 2. When active, `seededRandom()` returns a predictable pseudo-random number.
 * 3. Provide helpers to enable/disable test mode and query current state.
 */
let active = false;
let seed = 1;

export function setTestMode(enable, initialSeed = 1) {
  active = Boolean(enable);
  seed = initialSeed;
}

export function isTestModeEnabled() {
  return active;
}

export function seededRandom() {
  if (!active) return Math.random();
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function getCurrentSeed() {
  return seed;
}
