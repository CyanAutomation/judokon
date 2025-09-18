import { getStateSnapshot } from "./battleDebug.js";
import { seededRandom } from "../testModeUtils.js";

/**
 * Compute the delay before revealing the opponent's stat.
 *
 * @returns {number} Delay in milliseconds.
 * @summary Determine opponent reveal delay with test overrides.
 * @pseudocode
 * 1. Return `0` when `process.env.VITEST` is truthy.
 * 2. Respect `globalThis.__OVERRIDE_TIMERS.resolveDelay` when provided.
 * 3. Otherwise compute `300 + floor(seededRandom() * 401)`.
 */
export function resolveDelay() {
  try {
    if (typeof process !== "undefined" && process.env?.VITEST) return 0;
  } catch {}
  try {
    const overrides = globalThis?.__OVERRIDE_TIMERS;
    if (overrides && typeof overrides.resolveDelay === "number") {
      return overrides.resolveDelay;
    }
  } catch {}
  return 300 + Math.floor(seededRandom() * 401);
}

/**
 * Safely retrieve the current battle state snapshot.
 *
 * @returns {{state?: string}} Snapshot object or empty when unavailable.
 * @summary Get the current battle state without throwing.
 * @pseudocode
 * 1. Try `getStateSnapshot()`.
 * 2. Return the snapshot or `{}` if it fails.
 */
export function safeGetSnapshot() {
  try {
    return getStateSnapshot() || {};
  } catch {
    return {};
  }
}

/**
 * Check if the Next button is flagged ready.
 *
 * @param {HTMLButtonElement|null} btn Button to inspect.
 * @returns {boolean} True when `data-next-ready="true"`.
 * @summary Determine readiness via dataset flag.
 * @pseudocode
 * 1. Return `btn?.dataset.nextReady === "true"`.
 */
/**
 * Check if the Next button is flagged ready.
 *
 * @param {HTMLButtonElement|null} btn Button to inspect.
 * @returns {boolean} True when `data-next-ready="true"`.
 * @summary Determine readiness via dataset flag.
 * @pseudocode
 * 1. Check if button exists and has data-next-ready attribute set to "true".
 * 2. Return boolean indicating if the button is ready for next action.
 */
export function isNextReady(btn) {
  return btn?.dataset.nextReady === "true";
}

/**
 * Clear readiness attributes on the Next button and re-enable it.
 *
 * @param {HTMLButtonElement|null} btn Target button.
 * @returns {void}
 * @summary Remove readiness flag and enable button.
 * @pseudocode
 * 1. If `btn` exists, delete `data-next-ready` and set `disabled=false`.
 */
export function resetReadiness(btn) {
  if (btn) {
    delete btn.dataset.nextReady;
    btn.disabled = false;
  }
}
