/**
 * Display a temporary snackbar message near the bottom of the screen.
 *
 * @pseudocode
 * 1. Remove any existing `.snackbar` element and clear its timers.
 * 2. Create a new div with that class containing the provided message.
 * 3. Append the element to `document.body` and trigger the show animation.
 * 4. Schedule fade and removal timers.
 *
 * @param {string} message - Text content to display in the snackbar.
 */
import { SNACKBAR_FADE_MS, SNACKBAR_REMOVE_MS } from "./constants.js";
import { onFrame as scheduleFrame } from "../utils/scheduler.js";

let bar;
let fadeId;
let removeId;

function resetTimers() {
  clearTimeout(fadeId);
  clearTimeout(removeId);
  fadeId = setTimeout(() => {
    bar?.classList.remove("show");
  }, SNACKBAR_FADE_MS);
  removeId = setTimeout(() => {
    bar?.remove();
    bar = null;
  }, SNACKBAR_REMOVE_MS);
}

export function showSnackbar(message) {
  bar?.remove();
  clearTimeout(fadeId);
  clearTimeout(removeId);

  bar = document.createElement("div");
  bar.className = "snackbar";
  bar.textContent = message;
  bar.setAttribute("role", "status");
  bar.setAttribute("aria-live", "polite");
  document.body.appendChild(bar);
  scheduleFrame(() => bar?.classList.add("show"));
  resetTimers();
}

/**
 * Update the current snackbar's text and restart its timers.
 *
 * @pseudocode
 * 1. If no snackbar exists, call `showSnackbar(message)`.
 * 2. Otherwise, set the element's text to `message` and add the `show` class.
 * 3. Clear and restart fade and removal timers.
 *
 * @param {string} message - New text for the snackbar.
 */
export function updateSnackbar(message) {
  if (!bar) {
    showSnackbar(message);
    return;
  }
  bar.textContent = message;
  bar.classList.add("show");
  resetTimers();
}
