import { fetchJson, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";
import { escapeHTML } from "./utils.js";
import { marked } from "../vendor/marked.esm.js";
import { loadSettings } from "./settingsStorage.js";
import { toggleTooltipOverlayDebug } from "./tooltipOverlayDebug.js";
import { getSanitizer } from "./sanitizeHtml.js";
import { debugLog } from "./debug.js";

let tooltipDataPromise;
let cachedData;
const loggedMissing = new Set();
const loggedUnbalanced = new Set();
let tooltipEl;

/**
 * Recursively flatten a tooltip object using dot notation.
 *
 * This converts nested tooltip category objects into a single-level map
 * where keys are joined by `.` (for example `settings.display.mode`).
 *
 * @pseudocode
 * 1. If `obj` is null/undefined or not an object, return an empty map.
 * 2. For each entry (key, value) in `obj`:
 *    - Compute the full `id` by joining `prefix` and `key` with a dot when `prefix` is present.
 *    - If `value` is a plain object (and not an Array), recurse into `flattenTooltips(value, id)` and merge results.
 *    - Otherwise set `acc[id] = value` (this preserves leaf values like strings or arrays).
 * 3. Return the accumulated flat map.
 *
 * Why: Flattening simplifies lookup of tooltip text by a single string key and
 * avoids repeated nested traversal at runtime when resolving tooltip IDs.
 *
 * @param {Record<string, any>} obj - Nested tooltip definitions.
 * @param {string} [prefix=""] - Current key prefix.
 * @returns {Record<string, string>} Flattened tooltip map.
 */
export function flattenTooltips(obj, prefix = "") {
  // Gracefully handle null/undefined or non-object inputs
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return {};
  }
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
    // Use try/catch instead of chaining .catch in case a mock returns undefined
    tooltipDataPromise = (async () => {
      try {
        return await fetchJson(`${DATA_DIR}tooltips.json`);
      } catch (err) {
        // In JSDOM, fetching file: URLs fails; fall back to import without noisy logs
        debugLog("Failed to load tooltips; using bundled JSON fallback.", err);
        return importJsonModule("../data/tooltips.json");
      }
    })();
  }
  const data = await tooltipDataPromise;
  cachedData = flattenTooltips(data || {});
  return cachedData;
}

/**
 * Retrieve the flattened tooltip map.
 *
 * @pseudocode
 * 1. Return the promise produced by `loadTooltips()` which will load and cache
 *    the flattened tooltip mapping.
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
 * 3. Parse the markdown with `marked.parseInline` when available; otherwise
 *    fall back to `marked.parse` and strip wrapping `<p>` tags.
 * 4. Replace newline characters with `<br>`.
 * 5. Return an object with `html` and a `warning` flag when markers are unbalanced.
 *
 * @param {string} text - Raw tooltip text to parse.
 * @returns {{ html: string, warning: boolean }} Parsed HTML and warning flag.
 */
export function parseTooltipText(text) {
  const raw = String(text ?? "");
  const normalized = raw.replace(/\r\n?/g, "\n").replace(/\\n/g, "\n");
  const safe = escapeHTML(normalized);
  const boldCount = (safe.match(/\*\*/g) || []).length;
  const italicPairMatches = safe.match(/_(.*?)_/g) || [];
  const totalUnderscores = (safe.match(/_/g) || []).length;
  const warning = boldCount % 2 !== 0 || totalUnderscores !== italicPairMatches.length * 2;
  let parsed = "";
  try {
    if (typeof marked.parseInline === "function") {
      parsed = marked.parseInline(safe);
    } else {
      parsed = marked.parse(safe).replace(/^<p>|<\/p>$/g, "");
    }
  } catch {
    parsed = safe;
  }
  const html = parsed.replace(/\n/g, "<br>").replace(/\\<br>/g, "<br>");
  return { html, warning };
}

function ensureTooltipElement() {
  if (typeof document === 'undefined') return null;
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
 * Resolve tooltip text for an element ID.
 *
 * @pseudocode
 * 1. Attempt direct lookup of `data[id]`.
 * 2. If missing, try `${id}.label` and `${id}.description`.
 * 3. When still missing, log a warning once and return fallback text.
 *
 * @param {string|undefined} id - Tooltip identifier from the element.
 * @param {Record<string,string>} data - Flattened tooltip dataset.
 * @returns {string} Resolved tooltip text or fallback.
 */
export function resolveTooltipText(id, data) {
  let text = data[id];
  if (!text && id && typeof id === "string") {
    text = data[`${id}.label`] || data[`${id}.description`];
  }
  if (!text) {
    if (!loggedMissing.has(id)) {
      console.warn(`Unknown tooltip id: ${id}`);
      loggedMissing.add(id);
    }
    return "More info coming…";
  }
  return text;
}

/**
 * Parse and sanitize tooltip HTML, warning on unbalanced markup.
 *
 * @pseudocode
 * 1. Parse markdown via `parseTooltipText` to get HTML and warning flag.
 * 2. Sanitize the HTML with `DOMPurify`.
 * 3. When warning is true, log once per `id` about unbalanced markup.
 *
 * @param {string} text - Raw tooltip text.
 * @param {string|undefined} id - Tooltip identifier for logging.
 * @param {object} DOMPurify - Sanitizer instance.
 * @returns {string} Sanitized HTML.
 */
export function sanitizeTooltip(text, id, DOMPurify) {
  const { html, warning } = parseTooltipText(text);
  if (warning && !loggedUnbalanced.has(id)) {
    console.warn(`Unbalanced markup in tooltip id: ${id}`);
    loggedUnbalanced.add(id);
  }
  return DOMPurify.sanitize(html);
}

/**
 * Position tooltip relative to the target within viewport.
 *
 * @pseudocode
 * 1. Read `getBoundingClientRect()` of `target`.
 * 2. Compute top/bottom positions with page scroll offsets.
 * 3. For zero-size targets, pin to bottom-left of viewport.
 * 4. Clamp horizontal position to avoid overflowing the viewport width.
 * 5. Apply `top` and `left` styles to the tooltip element.
 *
 * @param {HTMLElement} tip - Tooltip element to position.
 * @param {Element} target - Triggering element.
 * @returns {void}
 */
export function positionTooltip(tip, target) {
  const rect = target?.getBoundingClientRect?.() || {
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    height: 0
  };
  let top = rect.bottom + window.scrollY;
  let left = rect.left + window.scrollX;
  if (!rect.width && !rect.height) {
    top = window.innerHeight - tip.offsetHeight;
    left = 0;
  }
  const viewportWidth = document.documentElement.clientWidth;
  if (left + tip.offsetWidth > viewportWidth) {
    left = viewportWidth - tip.offsetWidth;
  }
  left = Math.max(0, left);
  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
}

/**
 * Initialize tooltips for elements with `[data-tooltip-id]`.
 *
 * @pseudocode
 * 1. Exit early when `root` (or `document`) is unavailable.
 * 2. Read the current settings and exit early if tooltips are disabled.
 * 3. Load tooltip data with `loadTooltips()`.
 * 4. Select all elements matching `[data-tooltip-id]` within `root`.
 * 5. For each element, attach hover (mouseenter/mouseover) and focus listeners.
 *    - `show` looks up the tooltip text, sanitizes it with DOMPurify, and positions the element.
 *    - `hide` hides the tooltip element (mouseleave/mouseout and blur).
 * 6. When an ID is missing, log a warning only once and show the fallback text "More info coming…".
 * 7. Return a cleanup function that removes the hover and focus listeners.
 *
 * @param {ParentNode} [root=globalThis.document] - Scope to search for tooltip targets.
 * @returns {Promise<() => void>} Resolves with a cleanup function.
 */
export async function initTooltips(root = globalThis.document) {
  const notifyReady = () => globalThis.dispatchEvent?.(new Event("tooltips:ready"));
  if (!root) {
    notifyReady();
    return () => {};
  }
  // Fast-path: if there are no tooltip targets, avoid loading settings,
  // sanitizer, or tooltip data. This dramatically reduces overhead for
  // pages without tooltips (common in unit tests and some views).
  const elements = root?.querySelectorAll?.("[data-tooltip-id]") || [];
  if (elements.length === 0) {
    notifyReady();
    return () => {};
  }
  let overlay = false;
  try {
    const settings = await loadSettings();
    overlay = Boolean(settings.featureFlags?.tooltipOverlayDebug?.enabled);
    if (!settings.tooltips) {
      toggleTooltipOverlayDebug(false);
      notifyReady();
      return () => {};
    }
  } catch {
    // ignore settings errors and assume enabled
  }
  toggleTooltipOverlayDebug(overlay);
  const DOMPurify = await getSanitizer();
  const data = await loadTooltips();
  const tip = ensureTooltipElement();
  if (!tip) {
    notifyReady();
    return () => {};
  }

  function show(e) {
    const target = e.currentTarget || e.target;
    const id = target?.dataset?.tooltipId;
    const text = resolveTooltipText(id, data);
    tip.innerHTML = sanitizeTooltip(text, id, DOMPurify);
    tip.style.display = "block";
    positionTooltip(tip, target);
  }

  function hide() {
    tip.style.display = "none";
  }

  elements.forEach((el) => {
    el.addEventListener("mouseenter", show);
    el.addEventListener("mouseover", show);
    el.addEventListener("focus", show);
    el.addEventListener("mouseleave", hide);
    el.addEventListener("mouseout", hide);
    el.addEventListener("blur", hide);
  });
  notifyReady();
  return () => {
    elements.forEach((el) => {
      el.removeEventListener("mouseenter", show);
      el.removeEventListener("mouseover", show);
      el.removeEventListener("focus", show);
      el.removeEventListener("mouseleave", hide);
      el.removeEventListener("mouseout", hide);
      el.removeEventListener("blur", hide);
    });
  };
}
