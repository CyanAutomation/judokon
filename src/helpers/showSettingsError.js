/**
 * Display a temporary error popup for settings failures.
 *
 * @pseudocode
 * 1. Remove any existing `.settings-error-popup` element.
 * 2. Create a new div with that class containing an error message.
 * 3. Append the div to `document.body`.
 * 4. Remove the popup after 2 seconds.
 */
import { SETTINGS_FADE_MS, SETTINGS_REMOVE_MS } from "./constants.js";

export function showSettingsError() {
  const existing = document.querySelector(".settings-error-popup");
  existing?.remove();
  const popup = document.createElement("div");
  popup.className = "settings-error-popup";
  popup.setAttribute("role", "alert");
  popup.setAttribute("aria-live", "assertive");
  popup.textContent = "Failed to update settings.";
  document.body.appendChild(popup);
  requestAnimationFrame(() => popup.classList.add("show"));
  setTimeout(() => {
    popup.classList.remove("show");
  }, SETTINGS_FADE_MS);
  setTimeout(() => popup.remove(), SETTINGS_REMOVE_MS);
}
