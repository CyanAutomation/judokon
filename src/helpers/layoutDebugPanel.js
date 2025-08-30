let enabledState = false;
const DEFAULT_SELECTORS = ["body *:not(script):not(style)"];

/**
 * Toggle the global layout debug panel.
 *
 * @pseudocode
 * 1. Exit early if `document.body` is unavailable.
 * 2. Remove any existing `.layout-debug-outline` classes.
 * 3. When `enabled` is true, add `.layout-debug-outline` to all visible
 *    elements matching the provided selectors. The default selector highlights
 *    all visible containers across the page.
 *
 * @param {boolean} enabled - Whether to show the outlines.
 * @param {string[]} [selectors] - Optional custom selectors.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function toggleLayoutDebugPanel(enabled, selectors = DEFAULT_SELECTORS) {
  if (!document.body) return;
  enabledState = Boolean(enabled);
  document
    .querySelectorAll(".layout-debug-outline")
    .forEach((el) => el.classList.remove("layout-debug-outline"));
  if (enabledState) {
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.offsetParent !== null) {
          el.classList.add("layout-debug-outline");
        }
      });
    });
  }
}
