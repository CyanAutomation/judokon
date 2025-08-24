/**
 * StatsPanel builds a stats list using the `.card-stats` structure.
 *
 * @pseudocode
 * constructor(stats, options)
 * 1. Validate the `stats` object and throw an error when invalid.
 * 2. Resolve panel classes from the provided `type` and `className` options.
 * 3. Create the root `<div>` with class `card-stats` and append an empty `<ul>`.
 *
 * update(stats)
 * 1. Store incoming `stats` or reuse existing ones.
 * 2. Load stat labels via `loadStatNames()` and pair them with the
 *    corresponding values.
 * 3. Clear the current list and populate it with `<li>` items containing
 *    the label, value and tooltip id.
 *
 * createStatsPanel(stats, options)
 * 1. Instantiate `StatsPanel` and call `update`.
 * 2. Return the panel's root element for backwards compatibility.
 */
import { escapeHTML } from "../helpers/utils.js";
import { loadStatNames } from "../helpers/stats.js";
import { STATS } from "../helpers/battleEngineFacade.js";

export class StatsPanel {
  /**
   * @param {object} stats - Object with stat values.
   * @param {object} [options] - Optional configuration.
   * @param {string} [options.type="common"] - Card rarity or panel type.
   * @param {string} [options.className] - Additional class name to apply.
   * @param {string} [options.ariaLabel="Judoka Stats"] - Optional ARIA label.
   */
  constructor(stats, options = {}) {
    if (!stats || typeof stats !== "object") {
      throw new Error("Stats object is required");
    }

    const { type = "common", className, ariaLabel = "Judoka Stats" } = options;

    this.stats = stats;
    this.element = document.createElement("div");
    this.element.className = `card-stats ${type}`.trim();
    if (className) this.element.classList.add(className);
    if (ariaLabel) this.element.setAttribute("aria-label", ariaLabel);

    this.list = document.createElement("ul");
    this.element.appendChild(this.list);
  }

  /**
   * Populate the stats list with current values.
   *
   * @param {object} [stats] - Updated stat values.
   * @returns {Promise<void>}
   */
  async update(stats = this.stats) {
    this.stats = stats || {};
    const { power = "?", speed = "?", technique = "?", kumikata = "?", newaza = "?" } = this.stats;

    this.list.textContent = "";

    const names = await loadStatNames();
    const values = [power, speed, technique, kumikata, newaza];
    const statsEntries = STATS.map((key, index) => ({
      label: names[index]?.name || key,
      value: values[index],
      id: key
    }));

    statsEntries.forEach(({ label, value, id }) => {
      const li = document.createElement("li");
      li.className = "stat";
      const strong = document.createElement("strong");
      strong.textContent = label;
      if (id) strong.dataset.tooltipId = `stat.${id}`;
      const span = document.createElement("span");
      span.innerHTML = escapeHTML(value);
      li.append(strong, span);
      this.list.appendChild(li);
    });
  }
}

/**
 * Creates, initializes, and returns the root HTML element of a `StatsPanel` component.
 * This function serves as a factory for the `StatsPanel` class, handling its instantiation
 * and initial data population.
 *
 * @param {object} stats - Object with stat values to display.
 * @param {object} [options] - Optional configuration for the StatsPanel.
 * @returns {Promise<HTMLElement>} A promise that resolves to the root HTML element of the StatsPanel.
 * @pseudocode
 * 1. Instantiate a new `StatsPanel` object, passing the `stats` and `options`.
 * 2. Asynchronously call the `update()` method on the created `panel` to populate it with data.
 * 3. Return the `element` property of the `panel` instance, which is the root HTML element.
 */
export async function createStatsPanel(stats, options = {}) {
  const panel = new StatsPanel(stats, options);
  await panel.update();
  return panel.element;
}
