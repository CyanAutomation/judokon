let enabledState = false;
const DEFAULT_SELECTORS = [
  ".judoka-card",
  ".card-container",
  ".card-carousel",
  ".home-screen",
  ".kodokan-screen"
];

/**
 * Toggle the global layout debug panel.
 *
 * @pseudocode
 * 1. Exit early if `document.body` is unavailable.
 * 2. Remove any existing `.layout-debug-outline` classes.
 * 3. When `enabled` is true, add `.layout-debug-outline` to all matching
 *    elements so their boxes are visible.
 *
 * @param {boolean} enabled - Whether to show the outlines.
 * @param {string[]} [selectors] - Optional custom selectors.
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
        el.classList.add("layout-debug-outline");
      });
    });
  }
}
