/**
 * Manage headless mode for non-UI runs.
 *
 * @pseudocode
 * 1. Track a boolean flag that marks headless activation.
 * 2. `setHeadlessMode(enable)` toggles the flag.
 * 3. `isHeadlessModeEnabled()` returns the flag value.
 */
let headless = false;

/**
 * Enable or disable headless mode.
 *
 * @pseudocode
 * headless = Boolean(enable)
 *
 * @param {boolean} enable - True to skip UI delays.
 * @returns {void}
 */
export function setHeadlessMode(enable) {
  headless = Boolean(enable);
}

/**
 * Check whether headless mode is active.
 *
 * @pseudocode
 * return headless
 *
 * @returns {boolean} True when headless mode is enabled.
 */
export function isHeadlessModeEnabled() {
  return headless;
}
