/**
 * Create a stats panel element using the `.card-stats` structure.
 *
 * @pseudocode
 * 1. Validate the `stats` object and throw an error when invalid.
 * 2. Resolve panel classes from the provided `type` and `className` options.
 * 3. Build a `<div>` with class `card-stats` containing a `<ul>` list.
 *    - For each stat key (power, speed, technique, kumikata, newaza)
 *      create an `<li>` with a label and value.
 * 4. Apply an accessible `aria-label` to the panel when provided.
 * 5. Return the completed panel element.
 *
 * @param {object} stats - Object with stat values.
 * @param {object} [options] - Optional configuration.
 * @param {string} [options.type="common"] - Card rarity or panel type.
 * @param {string} [options.className] - Additional class name to apply.
 * @param {string} [options.ariaLabel="Judoka Stats"] - Optional ARIA label.
 * @returns {HTMLDivElement} The stats panel element.
 */
import { escapeHTML } from "../helpers/utils.js";

export function createStatsPanel(stats, options = {}) {
  if (!stats || typeof stats !== "object") {
    throw new Error("Stats object is required");
  }

  const { type = "common", className, ariaLabel = "Judoka Stats" } = options;
  const { power = "?", speed = "?", technique = "?", kumikata = "?", newaza = "?" } = stats;

  const panel = document.createElement("div");
  panel.className = `card-stats ${type}`.trim();
  if (className) panel.classList.add(className);
  if (ariaLabel) panel.setAttribute("aria-label", ariaLabel);

  const list = document.createElement("ul");

  function addItem(label, value) {
    const li = document.createElement("li");
    li.className = "stat";
    const strong = document.createElement("strong");
    strong.textContent = label;
    const span = document.createElement("span");
    span.innerHTML = escapeHTML(value);
    li.append(strong, span);
    list.appendChild(li);
  }

  const statsEntries = [
    { label: "Power", key: power },
    { label: "Speed", key: speed },
    { label: "Technique", key: technique },
    { label: "Kumi-kata", key: kumikata },
    { label: "Ne-waza", key: newaza }
  ];

  statsEntries.forEach(({ label, key }) => addItem(label, key));
  panel.appendChild(list);
  return panel;
}
