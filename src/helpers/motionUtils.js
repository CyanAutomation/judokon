/**
 * Utilities for handling motion preference.
 */

/**
 * Determine synchronously if motion effects should be reduced.
 *
 * @pseudocode
 * 1. Attempt to read the "settings" item from `localStorage`.
 *    - Parse the JSON and check the `motionEffects` property.
 * 2. If `motionEffects` is `false`, return `true`.
 * 3. Otherwise, return whether the user prefers reduced motion via
 *    `matchMedia('(prefers-reduced-motion: reduce)')`.
 *
 * @returns {boolean} True if motion effects should be reduced.
 */
export function shouldReduceMotionSync() {
  try {
    const raw = localStorage.getItem("settings");
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.motionEffects === false) {
        return true;
      }
    }
  } catch {
    // Ignore JSON and localStorage errors
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
export function applyMotionPreference(enabled) {
  if (!enabled) {
    document.body.classList.add("reduce-motion");
  } else {
    document.body.classList.remove("reduce-motion");
  }
}
