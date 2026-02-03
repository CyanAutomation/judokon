/**
 * Display a temporary snackbar message near the bottom of the screen.
 * This is a compatibility wrapper that delegates to SnackbarManager.
 *
 * LEGACY API COMPATIBILITY:
 * - Maintains original showSnackbar(message) and updateSnackbar(message) signatures
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
 * 2. Track last shown snackbar controller for updateSnackbar() support.
 * 3. showSnackbar() delegates to manager.show() with NORMAL priority.
 * 4. updateSnackbar() calls controller.update() on last shown snackbar.
 *
 * @param {string|{text: string, type?: string, priority?: string, ttl?: number}} message - Message payload.
 * @see {@link ./SnackbarManager.js} Unified snackbar lifecycle manager
 * @see {@link ../../styles/snackbar.css} Snackbar styles and z-index configuration
 * @see {@link ../../styles/base.css} Centralized z-index custom properties (--z-index-*)
 */

import snackbarManager, { SnackbarPriority } from "./SnackbarManager.js";

// Track last shown snackbar for updateSnackbar() compatibility
let lastSnackbarController = null;

/**
 * Show a transient snackbar message at the bottom of the page.
 * Delegates to SnackbarManager with NORMAL priority and 3000ms auto-dismiss.
 *
 * @pseudocode
 * 1. Delegate to snackbarManager.show() with NORMAL priority.
 * 2. Configure 3000ms TTL to match legacy behavior.
 * 3. Store controller reference for updateSnackbar() support.
 * 4. Return void to maintain API compatibility.
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
          priority: message?.priority
        };
  lastSnackbarController = snackbarManager.show({
    ...payload,
    priority: payload.priority ?? SnackbarPriority.NORMAL,
    minDuration: 0,
    ttl: message?.ttl ?? 3000
  });
}

/**
 * Update the current snackbar text and restart its timers.
 * If no snackbar is active, creates a new one.
 *
 * @pseudocode
 * 1. If last controller exists and is active, call update() method.
 * 2. Otherwise create new snackbar via showSnackbar().
 * 3. Return void to maintain API compatibility.
 *
 * @param {string|{text: string, type?: string, priority?: string}} message - New message payload.
 * @returns {void}
 */
export function updateSnackbar(message) {
  if (lastSnackbarController) {
    try {
      lastSnackbarController.update(message);
      return;
    } catch {
      // Controller may be dismissed, fall through to create new
    }
  }

  showSnackbar(message);
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
