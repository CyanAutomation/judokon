/**
 * Control automatic continuation after round outcomes.
 *
 * @pseudocode
 * 1. Initialize `autoContinue` to `true`, enabling automatic progression between rounds by default.
 * 2. The value can be modified by calling `setAutoContinue(newValue)`.
 *
 * @type {boolean}
 */
export let autoContinue = true;

/**
 * Update the auto-continue flag.
 *
 * @param {boolean} val
 * @returns {void}
 * @pseudocode
 * 1. Coerce `val` to boolean (`false` disables).
 * 2. Store in module-scoped `autoContinue`.
 */
export function setAutoContinue(val) {
  autoContinue = val !== false;
}

export default autoContinue;
