import { createLayoutDebugPanel } from "../components/LayoutDebugPanel.js";

let panel = null;
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
 * 2. When `enabled` is true and no panel exists, create it and append to `body`.
 *    a. Automatically expand the panel so outlines are applied immediately.
 * 3. When disabled and a panel exists, remove outline classes and the panel.
 *
 * @param {boolean} enabled - Whether to show the panel.
 * @param {string[]} [selectors] - Optional custom selectors.
 */
export function toggleLayoutDebugPanel(enabled, selectors = DEFAULT_SELECTORS) {
  if (!document.body) return;
  if (enabled) {
    if (!panel) {
      panel = createLayoutDebugPanel(selectors);
      document.body.appendChild(panel);
      const toggle = panel.querySelector("#layout-debug-toggle");
      if (toggle && toggle.getAttribute("aria-expanded") === "false") {
        toggle.setAttribute("aria-expanded", "true");
        // If the panel uses a class to show expanded state, add it here:
        const panelContent = panel.querySelector("#layout-debug-content");
        if (panelContent) {
          panelContent.classList.add("expanded");
        }
        // If outlines are applied via JS, apply them here:
        selectors.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => el.classList.add("layout-debug-outline"));
        });
      }
    }
  } else if (panel) {
    document
      .querySelectorAll(".layout-debug-outline")
      .forEach((el) => el.classList.remove("layout-debug-outline"));
    panel.remove();
    panel = null;
  }
}
