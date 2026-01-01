/**
 * Display a temporary snackbar message near the bottom of the screen.
 *
 * @pseudocode
 * 1. Clear any active animation listeners for a visible snackbar.
 * 2. Create a new div with class `.snackbar` containing the message.
 * 3. Replace `#snackbar-container` children with this element and trigger the animation.
 * 4. Remove the snackbar on `animationend` and reset internal state.
 *
 * @param {string} message - Text content to display in the snackbar.
 */
let bar;
let animationListener;
let animationTarget;
let animationToken = 0;

const ACTIVE_CLASS = "snackbar--active";
const VALID_ANIMATIONS = new Set(["snackbar-cycle", "snackbar-static"]);

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

function resetState() {
  if (animationTarget && animationListener) {
    animationTarget.removeEventListener("animationend", animationListener);
  }
  bar = null;
  animationListener = null;
  animationTarget = null;
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

function clearAnimationListener(target) {
  if (!target || !animationListener || target !== animationTarget) return;
  target.removeEventListener("animationend", animationListener);
  animationListener = null;
  animationTarget = null;
}

function activateSnackbar(target) {
  if (!target) return;
  animationToken += 1;
  const token = String(animationToken);
  clearAnimationListener(target);
  target.dataset.snackbarToken = token;
  animationTarget = target;
  animationListener = (event) => {
    if (event.target !== target) return;
    if (event.animationName && !VALID_ANIMATIONS.has(event.animationName)) return;
    if (target.dataset.snackbarToken !== token) return;
    target.classList.remove(ACTIVE_CLASS);
    target.remove();
    resetState();
  };
  target.addEventListener("animationend", animationListener);
  target.classList.remove(ACTIVE_CLASS);
  // Force a reflow so the animation can restart cleanly on updates.
  // eslint-disable-next-line no-unused-expressions
  target.offsetWidth;
  target.classList.add(ACTIVE_CLASS);
}

/**
 * Show a transient snackbar message at the bottom of the page.
 *
 * @pseudocode
 * 1. Respect `window.__disableSnackbars` if present and return early.
 * 2. Ensure a `#snackbar-container` exists (create a test no-op container when needed).
 * 3. Clear existing animation listeners and create a `.snackbar` element with `message` text.
 * 4. Insert it into the container, then attach an `animationend` listener and add
 *    the active class to kick off the animation cycle.
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
  const container = doc.getElementById("snackbar-container");
  if (!container) {
    resetState();
    return;
  }
  clearAnimationListener(animationTarget ?? bar);
  bar = doc.createElement("div");
  bar.className = "snackbar";
  bar.textContent = message;
  container.replaceChildren(bar);
  activateSnackbar(bar);
}

/**
 * Update the current snackbar text and restart its timers.
 *
 * @pseudocode
 * 1. If snackbars are globally disabled, return.
 * 2. Ensure `#snackbar-container` exists (create during tests).
 * 3. If there's no active snackbar, call `showSnackbar(message)` to create one.
 * 4. Otherwise replace the `.snackbar` text, restart the animation, and await `animationend`.
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
  const container = doc.getElementById("snackbar-container");
  if (!container) {
    resetState();
    return;
  }
  if (!bar || !container.contains(bar)) {
    showSnackbar(message);
    return;
  }
  bar.textContent = message;
  activateSnackbar(bar);
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
