/**
 * Display a temporary snackbar message near the bottom of the screen.
 *
 * @pseudocode
 * 1. Remove any existing `.snackbar` element.
 * 2. Create a new div with that class containing the provided message.
 * 3. Append the element to `document.body` and trigger the show animation.
 * 4. After `SNACKBAR_FADE_MS`, remove the `show` class to start fading.
 * 5. Remove the element from the DOM after `SNACKBAR_REMOVE_MS`.
 *
 * @param {string} message - Text content to display in the snackbar.
 */
import { SNACKBAR_FADE_MS, SNACKBAR_REMOVE_MS } from "./constants.js";

export function showSnackbar(message) {
  const existing = document.querySelector(".snackbar");
  existing?.remove();

  const bar = document.createElement("div");
  bar.className = "snackbar";
  bar.textContent = message;
  bar.setAttribute("role", "status");
  bar.setAttribute("aria-live", "polite");
  document.body.appendChild(bar);
  requestAnimationFrame(() => bar.classList.add("show"));
  setTimeout(() => {
    bar.classList.remove("show");
  }, SNACKBAR_FADE_MS);
  setTimeout(() => bar.remove(), SNACKBAR_REMOVE_MS);
}
