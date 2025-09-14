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
import { getScheduler } from "./scheduler.js";

let bar;
let fadeId;
let removeId;

function resetState() {
  bar = null;
  fadeId = undefined;
  removeId = undefined;
}

function resetTimers() {
  const scheduler = getScheduler();
  scheduler.clearTimeout(fadeId);
  scheduler.clearTimeout(removeId);
  const container = document.getElementById("snackbar-container");
  if (!container) {
    resetState();
    return;
  }
  fadeId = scheduler.setTimeout(() => {
    if (!document.getElementById("snackbar-container")) {
      resetState();
      return;
    }
    bar?.classList.remove("show");
  }, SNACKBAR_FADE_MS);
  removeId = scheduler.setTimeout(() => {
    if (!document.getElementById("snackbar-container")) {
      resetState();
      return;
    }
    bar?.remove();
    resetState();
  }, SNACKBAR_REMOVE_MS);
}

/**
 * Show a transient snackbar message at the bottom of the page.
 *
 * @pseudocode
 * 1. Respect `window.__disableSnackbars` if present and return early.
 * 2. Ensure a `#snackbar-container` exists (create a test no-op container when needed).
 * 3. Clear existing timers and create a `.snackbar` element with `message` text.
 * 4. Insert it into the container, requestAnimationFrame to add `show` class, and
 *    schedule fade and removal timers.
 *
 * @param {string} message - Text content to display in the snackbar.
 * @returns {void}
 */
export function showSnackbar(message) {
  try {
    if (typeof window !== "undefined" && window.__disableSnackbars) return;
  } catch {}
  // Defensive: ensure a snackbar container exists so early calls (tests)
  // don't fail because the container is missing. Create a no-op container
  // when running in test environments where the host page hasn't added it.
  try {
    if (typeof document !== "undefined" && !document.getElementById("snackbar-container")) {
      const container = document.createElement("div");
      container.id = "snackbar-container";
      document.body?.appendChild(container);
    }
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
 * Update the current snackbar text and restart its timers.
 *
 * @pseudocode
 * 1. If snackbars are globally disabled, return.
 * 2. Ensure `#snackbar-container` exists (create during tests).
 * 3. If there's no active snackbar, call `showSnackbar(message)` to create one.
 * 4. Otherwise replace the `.snackbar` text, ensure `show` class, and reset timers.
 *
 * @param {string} message - New text for the snackbar.
 * @returns {void}
 */
export function updateSnackbar(message) {
  try {
    if (typeof window !== "undefined" && window.__disableSnackbars) return;
  } catch {}
  // Defensive: expose updateSnackbar as safe even before DOM wiring.
  try {
    if (typeof document !== "undefined" && !document.getElementById("snackbar-container")) {
      const container = document.createElement("div");
      container.id = "snackbar-container";
      document.body?.appendChild(container);
    }
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

// Expose snackbar helpers globally for tests and early callers.
try {
  if (typeof window !== "undefined") {
    try {
      window.showSnackbar = showSnackbar;
    } catch {}
    try {
      window.updateSnackbar = updateSnackbar;
    } catch {}
  }
} catch {}
