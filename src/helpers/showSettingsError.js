/**
 * Display a temporary error popup for settings failures.
 *
 * @pseudocode
 * 1. Remove any existing `.settings-error-popup` element.
 * 2. Create a new div with that class containing an error message.
 * 3. Append the div to `document.body`.
 * 4. Schedule removal:
 *    - After `SETTINGS_FADE_MS`, remove the "show" class to start fading.
 *    - After `SETTINGS_REMOVE_MS`, remove the popup element.
 */
import { SETTINGS_FADE_MS, SETTINGS_REMOVE_MS } from "./constants.js";
import { onFrame as scheduleFrame, cancel as cancelFrame } from "../utils/scheduler.js";

/**
 * Show a transient settings error popup to the user.
 *
 * This function creates an accessible alert element, appends it to the
 * document body, and schedules fade and removal timers so the popup
 * visibly appears then disappears after the configured durations.
 *
 * @pseudocode
 * 1. Remove any existing element with class `.settings-error-popup` to avoid duplicates.
 * 2. Create a `div` with that class and set accessibility attributes
 *    (`role="alert"`, `aria-live="assertive"`) and message text.
 * 3. Append the element to `document.body`.
 * 4. Use a one-shot frame scheduler to add the `show` class so CSS animations run.
 * 5. Schedule a timeout after `SETTINGS_FADE_MS` to remove the `show` class (start fade).
 * 6. Schedule a final timeout after `SETTINGS_REMOVE_MS` to remove the element from DOM.
 * 7. Ensure frame tokens are canceled/cleaned up if re-run.
 *
 * Contract:
 * - Input: none.
 * - Output: DOM side-effects and scheduled timers.
 * - Errors: run silently in non-DOM environments (no-ops).
 *
 * @returns {void}
 */
export function showSettingsError() {
  const existing = document.querySelector(".settings-error-popup");
  existing?.remove();
  const popup = document.createElement("div");
  popup.className = "settings-error-popup";
  popup.setAttribute("role", "alert");
  popup.setAttribute("aria-live", "assertive");
  popup.textContent = "Failed to update settings.";
  document.body.appendChild(popup);
  // One-shot next-frame style application using shared scheduler, then cancel
  let token;
  const run = () => {
    popup.classList.add("show");
    if (token !== null && token !== undefined) cancelFrame(token);
  };
  token = scheduleFrame(run);
  setTimeout(() => {
    popup.classList.remove("show");
  }, SETTINGS_FADE_MS);
  setTimeout(() => popup.remove(), SETTINGS_REMOVE_MS);
}
