/**
 * Control automatic continuation after round outcomes.
 *
 * @pseudocode
 * 1. Check window.__AUTO_CONTINUE override on each access.
 * 2. Fall back to internal _autoContinue flag.
 * 3. Tests can set window.__AUTO_CONTINUE before page load to control behavior.
 *
 * @type {boolean}
 * @returns {boolean}
 */
let _autoContinue = true;

/**
 * Get the current autoContinue value, checking window override first.
 *
 * @returns {boolean}
 * @pseudocode
 * 1. Read window.__AUTO_CONTINUE when available.
 * 2. Use the override when it is a boolean.
 * 3. Otherwise return the module-scoped fallback.
 */
export function getAutoContinue() {
  if (typeof window !== "undefined") {
    const override = window.__AUTO_CONTINUE;
    if (typeof override === "boolean") {
      return override;
    }
  }
  return _autoContinue;
}

/**
 * Update the auto-continue flag.
 *
 * @param {boolean} val
 * @returns {void}
 * @pseudocode
 * 1. Coerce `val` to boolean (`false` disables).
 * 2. Store in module-scoped `_autoContinue`.
 */
export function setAutoContinue(val) {
  _autoContinue = val !== false;
}

export default getAutoContinue;
