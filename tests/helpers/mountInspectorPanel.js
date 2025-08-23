import { createInspectorPanel } from "../../src/helpers/inspector/createInspectorPanel.js";

/**
 * Mount the inspector panel for a given judoka and return the panel element.
 *
 * @param {object} judoka - Judoka data to display.
 * @returns {HTMLElement} Mounted inspector panel element.
 */
export function mountInspectorPanel(judoka) {
  const container = document.createElement("div");
  const panel = createInspectorPanel(container, judoka);
  container.appendChild(panel);
  document.body.appendChild(container);
  return panel;
}

if (typeof window !== "undefined") {
  // Expose for browser environments like Playwright.
  window.mountInspectorPanel = mountInspectorPanel;
}
