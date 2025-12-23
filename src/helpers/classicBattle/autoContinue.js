/**
 * Control automatic continuation after round outcomes.
 *
 * @pseudocode
 * 1. Initialize `autoContinue` checking for window override first.
 * 2. The value can be modified by calling `setAutoContinue(newValue)`.
 * 3. Tests can set window.__AUTO_CONTINUE before page load to control initial value.
 *
 * @type {boolean}
 * @returns {boolean}
 */
export let autoContinue =
  typeof window !== "undefined" && typeof window.__AUTO_CONTINUE === "boolean"
    ? window.__AUTO_CONTINUE
    : true;

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
