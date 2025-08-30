/**
 * Utilities for handling motion preference.
 */

import { getSetting } from "./settingsCache.js";
/**
 * Determine synchronously if motion effects should be reduced.
 *
 * @pseudocode
 * 1. Call `getSetting("motionEffects")`.
 * 2. If the result is `false`, return `true`.
 * 3. Otherwise, return the value of
 *    `matchMedia('(prefers-reduced-motion: reduce)')`.
 *
 * @returns {boolean} True if motion effects should be reduced.
 */
export function shouldReduceMotionSync() {
  if (getSetting("motionEffects") === false) {
    return true;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Apply the motion preference by toggling a body class.
 *
 * @pseudocode
 * 1. If `enabled` is `false`, add the `reduce-motion` class to `document.body`.
 * 2. Otherwise, remove the `reduce-motion` class.
 *
 * @param {boolean} enabled - Whether motion effects are enabled.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function applyMotionPreference(enabled) {
  if (!enabled) {
    document.body.classList.add("reduce-motion");
  } else {
    document.body.classList.remove("reduce-motion");
  }
}
