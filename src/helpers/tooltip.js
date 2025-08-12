import { fetchJson, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { escapeHTML } from "./utils.js";
import { loadSettings } from "./settingsStorage.js";
import { toggleTooltipOverlayDebug } from "./tooltipOverlayDebug.js";

let tooltipDataPromise;
let cachedData;
const loggedMissing = new Set();
const loggedUnbalanced = new Set();
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
 *    - If the fetch fails, import the file with `importJsonModule` instead.
 * 3. Flatten nested categories with `flattenTooltips()` and cache the result.
 * 4. Return the cached map.
 *
 * @returns {Promise<Record<string, string>>} Tooltip lookup object.
 */
async function loadTooltips() {
  if (cachedData) return cachedData;
  if (!tooltipDataPromise) {
    tooltipDataPromise = fetchJson(`${DATA_DIR}tooltips.json`).catch(async (err) => {
      console.error("Failed to load tooltips:", err);
      return importJsonModule("../data/tooltips.json");
    });
  }
  const data = await tooltipDataPromise;
  cachedData = flattenTooltips(data);
  return cachedData;
}

/**
 * Retrieve the flattened tooltip map.
 *
 * @returns {Promise<Record<string, string>>} Tooltip lookup object.
 */
export function getTooltips() {
  return loadTooltips();
}

/**
 * Converts tooltip markdown to sanitized HTML and flags unbalanced markup.
 *
 * @pseudocode
 * 1. Escape HTML in `text` using `escapeHTML`.
 * 2. Count occurrences of `**` and `_` to detect unbalanced markers.
 * 3. Replace newline characters with `<br>`.
 * 4. Replace `**bold**` with `<strong>` elements.
 * 5. Replace `_italic_` with `<em>` elements.
 * 6. Return an object with `html` and a `warning` flag when markers are unbalanced.
 *
 * @param {string} text - Raw tooltip text to parse.
 * @returns {{ html: string, warning: boolean }} Parsed HTML and warning flag.
 */
export function parseTooltipText(text) {
  const safe = escapeHTML(text || "");
  const boldCount = (safe.match(/\*\*/g) || []).length;
  const italicPairMatches = safe.match(/_(.*?)_/g) || [];
  const totalUnderscores = (safe.match(/_/g) || []).length;
  const warning = boldCount % 2 !== 0 || totalUnderscores !== italicPairMatches.length * 2;
  const html = safe
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.*?)_/g, "<em>$1</em>");
  return { html, warning };
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
 * 1. Read the current settings and exit early if tooltips are disabled.
 * 2. Load tooltip data with `loadTooltips()`.
 * 3. Select all elements matching `[data-tooltip-id]` within `root`.
 * 4. For each element, attach hover and focus listeners.
 *    - `show` looks up the tooltip text and positions the element.
 *    - `hide` hides the tooltip element.
 * 5. When an ID is missing, log a warning only once and skip display.
 *
 * @param {ParentNode} [root=document] - Scope to search for tooltip targets.
 * @returns {Promise<void>} Resolves when listeners are attached.
 */
export async function initTooltips(root = document) {
  let overlay = false;
  try {
    const settings = await loadSettings();
    overlay = Boolean(settings.featureFlags?.tooltipOverlayDebug?.enabled);
    if (!settings.tooltips) {
      toggleTooltipOverlayDebug(false);
      return;
    }
  } catch {
    // ignore settings errors and assume enabled
  }
  toggleTooltipOverlayDebug(overlay);
  const data = await loadTooltips();
  const elements = root.querySelectorAll?.("[data-tooltip-id]") || [];
  if (elements.length === 0) return;
  const tip = ensureTooltipElement();

  function show(e) {
    const id = e.currentTarget.dataset.tooltipId;
    let text = data[id];
    // Fallback for parent IDs like `settings.foo` by trying common leaf keys
    if (!text && id && typeof id === "string") {
      text = data[`${id}.label`] || data[`${id}.description`];
    }
    if (!text) {
      if (!loggedMissing.has(id)) {
        console.warn(`Unknown tooltip id: ${id}`);
        loggedMissing.add(id);
      }
      return;
    }
    const { html, warning } = parseTooltipText(text);
    tip.innerHTML = html;
    if (warning && !loggedUnbalanced.has(id)) {
      console.warn(`Unbalanced markup in tooltip id: ${id}`);
      loggedUnbalanced.add(id);
    }
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
