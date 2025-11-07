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
import { getScheduler, realScheduler } from "./scheduler.js";

let bar;
let fadeId;
let removeId;

/**
 * Get a safe document reference that works in both DOM and non-DOM environments.
 *
 * @pseudocode
 * 1. Check whether `globalThis` is defined for the current runtime.
 * 2. Return `globalThis.document` when available; otherwise return `null`.
 *
 * @returns {Document|null} The document object or null if unavailable.
 */
function getDocumentRef() {
  if (typeof globalThis === "undefined") {
    return null;
  }
  return globalThis.document ?? null;
}

function ensureDomOrReset() {
  const doc = getDocumentRef();
  if (!doc) {
    resetState();
    return null;
  }
  return doc;
}

/**
 * Get a safe requestAnimationFrame function with fallback support.
 *
 * @pseudocode
 * 1. If scheduler has requestAnimationFrame, return bound scheduler method.
 * 2. If globalThis has requestAnimationFrame, return bound global method.
 * 3. Otherwise, return setTimeout-based fallback with 0ms delay.
 *
 * @param {object} scheduler - The scheduler object to check for RAF support.
 * @returns {function} A function that behaves like requestAnimationFrame.
 */
function createSetTimeoutFallback(timerFn) {
  return (callback) => {
    return timerFn(callback, 0);
  };
}

function getGlobalRequestAnimationFrame() {
  if (typeof globalThis === "undefined") return null;

  const raf = globalThis.requestAnimationFrame;
  if (typeof raf === "function") return raf.bind(globalThis);

  const timeout = globalThis.setTimeout;
  if (typeof timeout === "function") {
    return createSetTimeoutFallback(timeout.bind(globalThis));
  }
  return null;
}

function getSafeRequestAnimationFrame(scheduler) {
  if (scheduler && typeof scheduler.requestAnimationFrame === "function") {
    return scheduler.requestAnimationFrame.bind(scheduler);
  }
  const globalFallback = getGlobalRequestAnimationFrame();
  if (globalFallback) {
    return globalFallback;
  }
  return createSetTimeoutFallback(setTimeout);
}

function resetState() {
  bar = null;
  fadeId = undefined;
  removeId = undefined;
}

function ensureSnackbarContainer(doc) {
  if (!doc.getElementById("snackbar-container")) {
    const container = doc.createElement("div");
    container.id = "snackbar-container";
    doc.body?.appendChild(container);
  }
}

function isSnackbarsDisabled() {
  try {
    return typeof window !== "undefined" && window.__disableSnackbars;
  } catch {
    return false;
  }
}

function safeClearTimeout(scheduler, handle) {
  if (!scheduler) {
    realScheduler.clearTimeout(handle);
    return;
  }
  if (typeof scheduler.clearTimeout === "function") {
    scheduler.clearTimeout(handle);
    return;
  }
  realScheduler.clearTimeout(handle);
}

function resetTimers() {
  const scheduler = getScheduler();
  safeClearTimeout(scheduler, fadeId);
  safeClearTimeout(scheduler, removeId);
  const doc = ensureDomOrReset();
  if (!doc) {
    return;
  }
  const docRef = doc;
  const container = doc.getElementById("snackbar-container");
  if (!container) {
    resetState();
    return;
  }
  fadeId = scheduler.setTimeout(() => {
    if (!docRef?.getElementById("snackbar-container")) {
      resetState();
      return;
    }
    bar?.classList.remove("show");
  }, SNACKBAR_FADE_MS);
  removeId = scheduler.setTimeout(() => {
    if (!docRef?.getElementById("snackbar-container")) {
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
  if (isSnackbarsDisabled()) return;
  const doc = ensureDomOrReset();
  if (!doc) {
    return;
  }
  // Defensive: ensure a snackbar container exists so early calls (tests)
  // don't fail because the container is missing. Create a no-op container
  // when running in test environments where the host page hasn't added it.
  try {
    ensureSnackbarContainer(doc);
  } catch {}
  const scheduler = getScheduler();
  const requestFrame = getSafeRequestAnimationFrame(scheduler);
  safeClearTimeout(scheduler, fadeId);
  safeClearTimeout(scheduler, removeId);
  const container = doc.getElementById("snackbar-container");
  if (!container) {
    resetState();
    return;
  }
  bar = doc.createElement("div");
  bar.className = "snackbar";
  bar.textContent = message;
  container.replaceChildren(bar);
  // Use a one-shot animation frame to toggle the class without
  // registering a persistent scheduler callback.
  requestFrame(() => bar?.classList.add("show"));
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
  if (isSnackbarsDisabled()) return;
  const doc = ensureDomOrReset();
  if (!doc) {
    return;
  }
  // Defensive: expose updateSnackbar as safe even before DOM wiring.
  try {
    ensureSnackbarContainer(doc);
  } catch {}
  const scheduler = getScheduler();
  const container = doc.getElementById("snackbar-container");
  if (!container) {
    safeClearTimeout(scheduler, fadeId);
    safeClearTimeout(scheduler, removeId);
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
