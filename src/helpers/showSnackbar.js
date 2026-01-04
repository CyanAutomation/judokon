/**
 * Display a temporary snackbar message near the bottom of the screen.
 * Supports stacking up to 2 concurrent messages with visual hierarchy.
 *
 * Z-Index Hierarchy (Centralized System):
 * - Uses var(--z-index-snackbar) = 1040 from base.css
 * - Positioned BELOW modals (1050) and tooltips (1070)
 * - Ensures snackbars don't obscure critical interactive elements
 * - Part of centralized z-index management system for consistent layering
 *
 * @pseudocode
 * 1. Add new message to queue (max 2 messages).
 * 2. If queue exceeds limit, dismiss oldest message.
 * 3. Create snackbar element with unique ID and accessibility attributes.
 * 4. Apply positioning classes based on queue position (.snackbar-top/.snackbar-bottom).
 * 5. Set independent 3000ms auto-dismiss timer for each message.
 * 6. Handle animation lifecycle with animationend event cleanup.
 *
 * @param {string} message - Text content to display in the snackbar.
 * @see {@link ../../styles/snackbar.css} Snackbar styles and z-index configuration
 * @see {@link ../../styles/base.css} Centralized z-index custom properties (--z-index-*)
 */

// Queue-based state management (supports up to 2 concurrent messages)
const messageQueue = []; // Array of { id, text, element, timeoutId, animationListener, token }
const MAX_VISIBLE = 2;
let nextId = 0;
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
  // Clean up all messages in queue
  messageQueue.forEach((msg) => {
    if (msg.element && msg.animationListener) {
      msg.element.removeEventListener("animationend", msg.animationListener);
    }
    if (msg.timeoutId) {
      clearTimeout(msg.timeoutId);
    }
  });
  messageQueue.length = 0; // Clear array
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
  if (!target) return;
  const msg = messageQueue.find((m) => m.element === target);
  if (msg && msg.animationListener) {
    target.removeEventListener("animationend", msg.animationListener);
    msg.animationListener = null;
  }
}

/**
 * Dismiss a snackbar by ID, cleaning up its resources.
 *
 * @pseudocode
 * 1. Find message in queue by ID.
 * 2. Clear its timeout and animation listener.
 * 3. Remove element from DOM.
 * 4. Remove from queue array.
 * 5. Re-render remaining messages to update positioning.
 *
 * @param {number} id - The unique ID of the snackbar to dismiss.
 */
function dismissSnackbar(id) {
  const index = messageQueue.findIndex((msg) => msg.id === id);
  if (index === -1) return;

  const msg = messageQueue[index];

  // Clear timeout
  if (msg.timeoutId) {
    clearTimeout(msg.timeoutId);
  }

  // Clear animation listener
  if (msg.element && msg.animationListener) {
    msg.element.removeEventListener("animationend", msg.animationListener);
  }

  // Remove from DOM
  if (msg.element && msg.element.parentNode) {
    msg.element.remove();
  }

  // Remove from queue
  messageQueue.splice(index, 1);

  // Re-render remaining messages to update positioning
  renderQueue();
}

/**
 * Apply positioning and opacity classes to all messages in queue.
 *
 * @pseudocode
 * 1. Iterate through message queue.
 * 2. For first message (index 0) when multiple exist: add .snackbar-top and .snackbar-stale.
 * 3. For last message or only message: add .snackbar-bottom, remove top/stale classes.
 * 4. Transitions handled by CSS for smooth animation.
 *
 * @returns {void}
 */
function renderQueue() {
  messageQueue.forEach((msg, index) => {
    if (!msg.element) return;

    // Top message (older, pushed up with reduced opacity)
    if (index === 0 && messageQueue.length > 1) {
      msg.element.classList.add("snackbar-top", "snackbar-stale");
      msg.element.classList.remove("snackbar-bottom");
    }
    // Bottom message (newer, full opacity)
    else {
      msg.element.classList.add("snackbar-bottom");
      msg.element.classList.remove("snackbar-top", "snackbar-stale");
    }
  });
}

function activateSnackbar(target, id) {
  if (!target) return;
  animationToken += 1;
  const token = String(animationToken);

  clearAnimationListener(target);

  const animationListener = (event) => {
    if (event.target !== target) return;
    if (event.animationName && !VALID_ANIMATIONS.has(event.animationName)) return;
    if (target.dataset.snackbarToken !== token) return;

    // Dismiss this snackbar when animation completes
    dismissSnackbar(id);
  };

  // Store listener in queue for cleanup
  const msg = messageQueue.find((m) => m.id === id);
  if (msg) {
    msg.animationListener = animationListener;
    msg.token = token;
  }

  target.addEventListener("animationend", animationListener);
  target.dataset.snackbarToken = token;
  target.classList.remove(ACTIVE_CLASS);

  // Force a reflow so the animation can restart cleanly on updates.
  target.offsetWidth;
  target.classList.add(ACTIVE_CLASS);
}

/**
 * Show a transient snackbar message at the bottom of the page.
 * Supports stacking up to 2 concurrent messages.
 *
 * @pseudocode
 * 1. Respect `window.__disableSnackbars` if present and return early.
 * 2. Ensure a `#snackbar-container` exists.
 * 3. If queue is at capacity (2 messages), dismiss the oldest.
 * 4. Create new snackbar element with unique ID and accessibility attributes.
 * 5. Add to queue and append to container.
 * 6. Set independent 3000ms auto-dismiss timer.
 * 7. Apply positioning classes and activate animation.
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

  // Defensive: ensure a snackbar container exists
  try {
    ensureSnackbarContainer(doc);
  } catch {}

  const container = doc.getElementById("snackbar-container");
  if (!container) {
    resetState();
    return;
  }

  // Enforce MAX_VISIBLE limit: dismiss oldest if at capacity
  if (messageQueue.length >= MAX_VISIBLE) {
    const oldest = messageQueue[0];
    dismissSnackbar(oldest.id);
  }

  // Create new snackbar element
  const id = nextId++;
  const element = doc.createElement("div");
  element.className = "snackbar";
  element.textContent = message;

  // Accessibility: each snackbar is an independent status announcement
  element.setAttribute("role", "status");
  element.setAttribute("aria-atomic", "false");
  element.setAttribute("aria-live", "polite");
  element.dataset.snackbarId = String(id);

  // Add to container (append, don't replace - supports stacking)
  container.appendChild(element);

  // Set independent auto-dismiss timer (3000ms)
  const timeoutId = setTimeout(() => {
    dismissSnackbar(id);
  }, 3000);

  // Add to queue
  messageQueue.push({
    id,
    text: message,
    element,
    timeoutId,
    animationListener: null,
    token: null
  });

  // Apply positioning classes and activate animation
  renderQueue();
  activateSnackbar(element, id);
}

/**
 * Update the current snackbar text and restart its timers.
 * Note: With queue-based system, this updates the most recent snackbar.
 *
 * @pseudocode
 * 1. If snackbars are globally disabled, return.
 * 2. Ensure `#snackbar-container` exists.
 * 3. If queue is empty, call `showSnackbar(message)` to create a new one.
 * 4. Otherwise update the most recent snackbar's text and restart its animation.
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

  // If no messages in queue, create a new one
  if (messageQueue.length === 0) {
    showSnackbar(message);
    return;
  }

  // Update the most recent (last) snackbar
  const mostRecent = messageQueue[messageQueue.length - 1];
  if (!mostRecent.element || !container.contains(mostRecent.element)) {
    showSnackbar(message);
    return;
  }

  mostRecent.element.textContent = message;
  mostRecent.text = message;
  activateSnackbar(mostRecent.element, mostRecent.id);
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
