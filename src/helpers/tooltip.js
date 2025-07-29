import { fetchJson } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { escapeHTML } from "./utils.js";

let tooltipDataPromise;
let cachedData;
const loggedMissing = new Set();
let tooltipEl;

/**
 * Recursively flatten a tooltip object using dot notation.
 *
 * @param {Record<string, any>} obj - Nested tooltip definitions.
 * @param {string} [prefix=""] - Current key prefix.
 * @returns {Record<string, string>} Flattened tooltip map.
 */
export function flattenTooltips(obj, prefix = "") {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const id = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(acc, flattenTooltips(value, id));
    } else {
      acc[id] = value;
    }
    return acc;
  }, {});
}

/**
 * Fetch tooltip text mapping once.
 *
 * @pseudocode
 * 1. When `cachedData` exists, return it.
 * 2. Otherwise fetch `tooltips.json` using `fetchJson`.
 * 3. Flatten nested categories with `flattenTooltips()` and cache the result.
 * 4. On failure, log the error once and return an empty object.
 *
 * @returns {Promise<Record<string, string>>} Tooltip lookup object.
 */
async function loadTooltips() {
  if (cachedData) return cachedData;
  if (!tooltipDataPromise) {
    tooltipDataPromise = fetchJson(`${DATA_DIR}tooltips.json`).catch((err) => {
      console.error("Failed to load tooltips:", err);
      return {};
    });
  }
  const data = await tooltipDataPromise;
  cachedData = flattenTooltips(data);
  return cachedData;
}

/**
 * Converts tooltip markdown to sanitized HTML.
 *
 * @pseudocode
 * 1. Escape HTML in `text` using `escapeHTML`.
 * 2. Replace newline characters with `<br>`.
 * 3. Replace `**bold**` with `<strong>` elements.
 * 4. Replace `_italic_` with `<em>` elements.
 * 5. Return the transformed string.
 *
 * @param {string} text - Raw tooltip text to parse.
 * @returns {string} HTML markup for the tooltip.
 */
export function parseTooltipText(text) {
  const safe = escapeHTML(text || "");
  return safe
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.*?)_/g, "<em>$1</em>");
}

function ensureTooltipElement() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement("div");
  tooltipEl.className = "tooltip";
  tooltipEl.setAttribute("role", "tooltip");
  tooltipEl.style.position = "absolute";
  tooltipEl.style.display = "none";
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

/**
 * Initialize tooltips for elements with `[data-tooltip-id]`.
 *
 * @pseudocode
 * 1. Load tooltip data with `loadTooltips()`.
 * 2. Select all elements matching `[data-tooltip-id]` within `root`.
 * 3. For each element, attach hover and focus listeners.
 *    - `show` looks up the tooltip text and positions the element.
 *    - `hide` hides the tooltip element.
 * 4. When an ID is missing, log a warning only once and skip display.
 *
 * @param {ParentNode} [root=document] - Scope to search for tooltip targets.
 * @returns {Promise<void>} Resolves when listeners are attached.
 */
export async function initTooltips(root = document) {
  const data = await loadTooltips();
  const elements = root.querySelectorAll?.("[data-tooltip-id]") || [];
  if (elements.length === 0) return;
  const tip = ensureTooltipElement();

  function show(e) {
    const id = e.currentTarget.dataset.tooltipId;
    const text = data[id];
    if (!text) {
      if (!loggedMissing.has(id)) {
        console.warn(`Unknown tooltip id: ${id}`);
        loggedMissing.add(id);
      }
      return;
    }
    tip.innerHTML = parseTooltipText(text);
    tip.style.display = "block";
    const rect = e.currentTarget.getBoundingClientRect();
    let top = rect.bottom + window.scrollY;
    let left = rect.left + window.scrollX;
    if (!rect.width && !rect.height) {
      top = window.innerHeight - tip.offsetHeight;
      left = 0;
    }
    if (left + tip.offsetWidth > document.documentElement.clientWidth) {
      left = document.documentElement.clientWidth - tip.offsetWidth;
    }
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  }

  function hide() {
    tip.style.display = "none";
  }

  elements.forEach((el) => {
    el.addEventListener("mouseenter", show);
    el.addEventListener("focus", show);
    el.addEventListener("mouseleave", hide);
    el.addEventListener("blur", hide);
  });
}
