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
 * Applies the user's motion preference by adding or removing a CSS class
 * to the document body.
 *
 * @summary This function visually adjusts the application's motion effects
 * based on whether motion is enabled or should be reduced.
 *
 * @pseudocode
 * 1. Check the value of the `enabled` parameter.
 * 2. If `enabled` is `false` (meaning motion effects should be reduced), add the CSS class `reduce-motion` to `document.body`.
 * 3. If `enabled` is `true` (meaning motion effects are enabled), remove the CSS class `reduce-motion` from `document.body`.
 *
 * @param {boolean} enabled - `true` if motion effects are enabled, `false` if they should be reduced.
 * @returns {void}
 */
export function applyMotionPreference(enabled) {
  if (!enabled) {
    document.body.classList.add("reduce-motion");
  } else {
    document.body.classList.remove("reduce-motion");
  }
}
