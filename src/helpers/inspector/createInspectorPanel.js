/**
 * Build an expandable inspector panel showing the judoka JSON.
 *
 * @pseudocode
 * 1. Attempt to serialize `judoka` to formatted JSON.
 *    - If serialization fails, return a paragraph with "Invalid card data".
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
  } catch {
    const p = document.createElement("p");
    p.textContent = "Invalid card data";
    return p;
  }

  const panel = document.createElement("details");
  panel.className = "debug-panel";
  panel.setAttribute("aria-label", "Inspector panel");

  const summary = document.createElement("summary");
  summary.textContent = "Card Inspector";
  summary.tabIndex = 0;
  summary.style.minHeight = "44px";
  summary.style.minWidth = "44px";
  summary.style.display = "flex";
  summary.style.alignItems = "center";
  summary.style.outline = "2px solid transparent";
  summary.style.outlineOffset = "2px";
  summary.addEventListener("focus", () => {
    summary.style.outlineColor = "#000";
  });
  summary.addEventListener("blur", () => {
    summary.style.outlineColor = "transparent";
  });
  summary.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      panel.open = !panel.open;
      panel.dispatchEvent(new Event("toggle"));
    }
  });
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
