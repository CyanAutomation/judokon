/**
 * Display a temporary snackbar message near the bottom of the screen.
 *
 * @pseudocode
 * 1. Clear existing timers for any visible snackbar.
 * 2. Create a new div with class `.snackbar` containing the message.
 * 3. Replace `#snackbar-container` children with this element and trigger the show animation.
 * 4. Verify the container still exists and schedule fade and removal timers.
 *
 * @param {string} message - Text content to display in the snackbar.
 */
import { SNACKBAR_FADE_MS, SNACKBAR_REMOVE_MS } from "./constants.js";

let bar;
let fadeId;
let removeId;

function resetState() {
  bar = null;
  fadeId = undefined;
  removeId = undefined;
}

function resetTimers() {
  clearTimeout(fadeId);
  clearTimeout(removeId);
  const container = document.getElementById("snackbar-container");
  if (!container) {
    resetState();
    return;
  }
  fadeId = setTimeout(() => {
    if (!document.getElementById("snackbar-container")) {
      resetState();
      return;
    }
    bar?.classList.remove("show");
  }, SNACKBAR_FADE_MS);
  removeId = setTimeout(() => {
    if (!document.getElementById("snackbar-container")) {
      resetState();
      return;
    }
    bar?.remove();
    resetState();
  }, SNACKBAR_REMOVE_MS);
}

export function showSnackbar(message) {
  try {
    if (typeof window !== "undefined" && window.__disableSnackbars) return;
  } catch {}
  clearTimeout(fadeId);
  clearTimeout(removeId);
  const container = document.getElementById("snackbar-container");
  if (!container) {
    resetState();
    return;
  }
  bar = document.createElement("div");
  bar.className = "snackbar";
  bar.textContent = message;
  container.replaceChildren(bar);
  // Use a one-shot animation frame to toggle the class without
  // registering a persistent scheduler callback.
  requestAnimationFrame(() => bar?.classList.add("show"));
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
  try {
    if (typeof window !== "undefined" && window.__disableSnackbars) return;
  } catch {}
  const container = document.getElementById("snackbar-container");
  if (!container) {
    clearTimeout(fadeId);
    clearTimeout(removeId);
    resetState();
    return;
  }
  if (!bar) {
    showSnackbar(message);
    return;
  }
  bar.textContent = message;
  bar.classList.add("show");
  resetTimers();
}
