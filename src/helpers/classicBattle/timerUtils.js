import { getStateSnapshot } from "./battleDebug.js";

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
