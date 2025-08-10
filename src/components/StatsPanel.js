/**
 * Create a stats panel element using the `.card-stats` structure.
 *
 * @pseudocode
 * 1. Validate the `stats` object and throw an error when invalid.
 * 2. Resolve panel classes from the provided `type` and `className` options.
 * 3. Load stat labels via `loadStatNames()` and pair them with the
 *    corresponding values from the `stats` object.
 * 4. Build a `<div>` with class `card-stats` containing a `<ul>` list.
 *    - For each loaded label create an `<li>` with the label, value and
 *      tooltip id.
 * 5. Apply an accessible `aria-label` to the panel when provided.
 * 6. Return the completed panel element.
 *
 * @param {object} stats - Object with stat values.
 * @param {object} [options] - Optional configuration.
 * @param {string} [options.type="common"] - Card rarity or panel type.
 * @param {string} [options.className] - Additional class name to apply.
 * @param {string} [options.ariaLabel="Judoka Stats"] - Optional ARIA label.
 * @returns {HTMLDivElement} The stats panel element.
 */
import { escapeHTML } from "../helpers/utils.js";
import { loadStatNames } from "../helpers/stats.js";
import { STATS } from "../helpers/battleEngineFacade.js";
export async function createStatsPanel(stats, options = {}) {
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

  function addItem(label, value, id) {
    const li = document.createElement("li");
    li.className = "stat";
    const strong = document.createElement("strong");
    strong.textContent = label;
    if (id) strong.dataset.tooltipId = `stat.${id}`;
    const span = document.createElement("span");
    span.innerHTML = escapeHTML(value);
    li.append(strong, span);
    list.appendChild(li);
  }

  const names = await loadStatNames();
  const values = [power, speed, technique, kumikata, newaza];
  const statsEntries = STATS.map((key, index) => ({
    label: names[index]?.name || key,
    key: values[index],
    id: key
  }));

  statsEntries.forEach(({ label, key, id }) => addItem(label, key, id));
  panel.appendChild(list);
  return panel;
}
