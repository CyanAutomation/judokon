let enabledState = false;
const DEFAULT_SELECTORS = ["body *:not(script):not(style)"];

/**
 * Toggles the visibility of a global layout debug panel, which outlines
 * visible DOM elements to aid in debugging layout issues.
 *
 * @summary This function applies or removes a CSS class to elements,
 * causing them to display a visual border, useful for inspecting page layout.
 *
 * @pseudocode
 * 1. If `document.body` is not available (e.g., in a non-browser environment), exit early.
 * 2. Update the internal `enabledState` to reflect the new `enabled` value.
 * 3. Remove the `layout-debug-outline` class from all elements that currently have it, clearing any previous outlines.
 * 4. If `enabledState` is `true`:
 *    a. Iterate through each selector in the `selectors` array (defaulting to `DEFAULT_SELECTORS`).
 *    b. For each selector, query all matching elements in the document.
 *    c. For each matching element, if it is currently visible (i.e., `offsetParent` is not `null`), add the `layout-debug-outline` class to it.
 *
 * @param {boolean} enabled - If `true`, enables the debug panel and outlines elements; if `false`, disables it and removes outlines.
 * @param {string[]} [selectors=DEFAULT_SELECTORS] - Optional. An array of CSS selectors specifying which elements to outline. Defaults to outlining all visible elements.
 * @returns {void}
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
