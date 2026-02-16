/**
 * Display a temporary snackbar message near the bottom of the screen.
 * This is a compatibility wrapper that delegates to SnackbarManager.
 *
 * LEGACY API COMPATIBILITY:
 * - Maintains original showSnackbar(message) and updateSnackbar(message) signatures
 * - Exposes dismissSnackbar(id) for targeted dismissal
 * - Delegates to SnackbarManager for unified snackbar rendering
 * - All snackbars created via this API use NORMAL priority
 * - Auto-dismiss after 3000ms to match legacy behavior
 *
 * Z-Index Hierarchy (Centralized System):
 * - Uses var(--z-index-snackbar) = 1040 from base.css
 * - Positioned BELOW modals (1050) and tooltips (1070)
 * - Ensures snackbars don't obscure critical interactive elements
 * - Part of centralized z-index management system for consistent layering
 *
 * @pseudocode
 * 1. Import SnackbarManager singleton for unified snackbar rendering.
 * 2. showSnackbar() delegates to manager.show() with NORMAL priority.
 * 3. updateSnackbar() mutates only the latest visible snackbar.
 * 4. dismissSnackbar(id) delegates to manager.dismiss(id).
 *
 * @param {string|{text: string, type?: string, priority?: string, ttl?: number}} message - Message payload.
 * @see {@link ./SnackbarManager.js} Unified snackbar lifecycle manager
 * @see {@link ../../styles/snackbar.css} Snackbar styles and z-index configuration
 * @see {@link ../../styles/base.css} Centralized z-index custom properties (--z-index-*)
 */

import snackbarManager, { SnackbarPriority } from "./SnackbarManager.js";

/**
 * Show a transient snackbar message at the bottom of the page.
 * Delegates to SnackbarManager with NORMAL priority and 3000ms auto-dismiss.
 *
 * @pseudocode
 * 1. Delegate to snackbarManager.show() with NORMAL priority.
 * 2. Configure 3000ms TTL to match legacy behavior.
 * 3. Return void to maintain API compatibility.
 *
 * @param {string|{text: string, type?: string, priority?: string, ttl?: number}} message - Message payload.
 * @returns {void}
 */
export function showSnackbar(message) {
  const payload =
    typeof message === "string"
      ? { text: message }
      : {
          text: message?.text ?? message?.message ?? "",
          type: message?.type,
          priority: message?.priority,
          ttl: message?.ttl
        };
  snackbarManager.show({
    ...payload,
    priority: payload.priority ?? SnackbarPriority.NORMAL,
    minDuration: 0,
    ttl: payload.ttl ?? 3000
  });
}

/**
 * Update the latest visible snackbar text and restart its timers.
 * If no snackbar is active, this is a no-op.
 *
 * @pseudocode
 * 1. Resolve the latest visible snackbar ID from SnackbarManager.
 * 2. Return immediately when no visible snackbar exists.
 * 3. Delegate text/type/priority mutation to manager.update(id, message).
 *
 * @param {string|{text: string, type?: string, priority?: string}} message - New message payload.
 * @returns {void}
 */
export function updateSnackbar(message) {
  const latestId = snackbarManager.getLatestVisibleId();
  if (!latestId) {
    return;
  }

  snackbarManager.update(latestId, message);
}

/**
 * Dismiss a snackbar by ID.
 *
 * @pseudocode
 * 1. Delegate to SnackbarManager.dismiss(id).
 * 2. Return void for compatibility with helper usage.
 *
 * @param {string} id - Snackbar identifier.
 * @returns {void}
 */
export function dismissSnackbar(id) {
  void snackbarManager.dismiss(id);
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
    try {
      window.dismissSnackbar = dismissSnackbar;
    } catch {}
  }
} catch {}
