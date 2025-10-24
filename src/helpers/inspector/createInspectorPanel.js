/**
 * Build an expandable inspector panel showing the judoka JSON.
 *
 * @pseudocode
 * 1. Attempt to serialize `judoka` to formatted JSON.
 *    - If serialization fails, log an error and return a paragraph with "Invalid card data".
 * 2. Create a `<details>` element with class `debug-panel` and accessible summary.
 * 3. Append a `<pre>` element containing the JSON string.
 * 4. On toggle, set `container.dataset.inspector` when open and remove it when closed.
 * 5. Return the `<details>` panel.
 *
 * @param {HTMLElement} container - Card container element.
 * @param {object} judoka - Judoka data to display.
 * @returns {HTMLElement} Inspector panel element.
 */
export function createInspectorPanel(container, judoka) {
  let json;
  try {
    json = JSON.stringify(judoka, null, 2);
  } catch (error) {
    console.error("Failed to serialize judoka:", error);
    const p = document.createElement("p");
    p.textContent = "Invalid card data";
    p.setAttribute("data-feature-card-inspector", "error");
    return p;
  }

  const panel = document.createElement("details");
  panel.className = "debug-panel";
  panel.setAttribute("aria-label", "Inspector panel");
  panel.setAttribute("data-feature-card-inspector", "panel");

  const summary = document.createElement("summary");
  summary.textContent = "Card Inspector";
  panel.appendChild(summary);

  const jsonPre = document.createElement("pre");
  jsonPre.textContent = json;
  panel.appendChild(jsonPre);

  // Only show the card's JSON data. The markup preview was removed to
  // keep the inspector output concise.

  function updateDataset() {
    summary.setAttribute("aria-expanded", panel.open ? "true" : "false");
    if (panel.open) {
      container.dataset.inspector = "true";
    } else {
      container.removeAttribute("data-inspector");
    }
  }

  panel.addEventListener("toggle", updateDataset);
  updateDataset();

  return panel;
}
