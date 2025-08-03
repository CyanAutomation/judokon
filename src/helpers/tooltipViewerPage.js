import { fetchJson } from "./dataUtils.js";
import { parseTooltipText, flattenTooltips, initTooltips } from "./tooltip.js";
import { DATA_DIR } from "./constants.js";
import { onDomReady } from "./domReady.js";
import { createSidebarList } from "../components/SidebarList.js";
import { showSnackbar } from "./showSnackbar.js";

const INVALID_TOOLTIP_MSG = "Empty or whitespace-only content";
const MALFORMED_TOOLTIP_MSG = "Unbalanced markup detected";
const INVALID_KEY_MSG = "Invalid key format (prefix.name)";
const FILE_NOT_FOUND_MSG = "File not found";
const LOAD_ERROR_MSG = "Error loading tooltips.";
const KEY_PATTERN = /^[a-z]+\.[\w-]+$/;

/**
 * Extract line and column numbers from a JSON parse error.
 *
 * @pseudocode
 * 1. Run a regex on `error.message` to capture `line` and `column` digits.
 * 2. When both numbers exist, return them as an object.
 * 3. Otherwise, return `null`.
 *
 * @param {SyntaxError} error - SyntaxError thrown during JSON parsing.
 * @returns {{ line: number, column: number } | null} Parsed line/column or `null`.
 */
function extractLineAndColumn(error) {
  const message = error?.message ?? "";
  // Try several common error message formats
  // 1. "line X column Y"
  let match = /line (\d+)[^\d]+column (\d+)/i.exec(message);
  if (match) {
    return { line: Number(match[1]), column: Number(match[2]) };
  }
  // 2. "at line X column Y"
  match = /at line (\d+)[^\d]+column (\d+)/i.exec(message);
  if (match) {
    return { line: Number(match[1]), column: Number(match[2]) };
  }
  // 3. "at position Z" (return as column, line unknown)
  match = /at position (\d+)/i.exec(message);
  if (match) {
    return { line: null, column: Number(match[1]) };
  }
  // 4. "Unexpected token ... in JSON at position Z"
  match = /in JSON at position (\d+)/i.exec(message);
  if (match) {
    return { line: null, column: Number(match[1]) };
  }
  return null;
}

/**
 * Initialize the Tooltip Viewer page.
 *
 * @pseudocode
 * 1. Load and flatten `tooltips.json` using `fetchJson` and `flattenTooltips`.
 *    When the file is missing, show "File not found"; on parse errors display
 *    "Line X, Column Y"; otherwise show a generic loading error.
 * 2. Render a clickable list of keys filtered by the search box (300ms debounce),
 *    tagging items with a class based on their prefix (e.g. `stat`, `ui`) and
 *    flagging empty bodies, malformed markup, or invalid key names with a warning icon.
 * 3. Wrap the preview in a 300px-high container with a toggle button to expand
 *    or collapse long content.
 * 4. When a key is selected, display its parsed HTML and raw text in the
 *    preview, and show a warning when the markup is unbalanced.
 * 5. Provide copy buttons for the key and body using `navigator.clipboard` and
 *    show feedback with a snackbar and button animation.
 * 6. On page load, select the key from the URL hash when present and scroll to
 *    it.
 * 7. Call `initTooltips()` so help icons inside the page gain tooltips.
 */
export async function setupTooltipViewerPage() {
  const searchInput = document.getElementById("tooltip-search");
  let listPlaceholder = document.getElementById("tooltip-list");
  const previewEl = document.getElementById("tooltip-preview");
  const rawEl = document.getElementById("tooltip-raw");
  const warningEl = document.getElementById("tooltip-warning");
  const keyCopyBtn = document.getElementById("copy-key-btn");
  const bodyCopyBtn = document.getElementById("copy-body-btn");

  const previewContainer = document.createElement("div");
  previewContainer.className = "preview-container";
  previewEl.parentNode.insertBefore(previewContainer, previewEl);
  previewContainer.appendChild(previewEl);

  const toggleBtn = document.createElement("button");
  toggleBtn.id = "toggle-preview-btn";
  toggleBtn.className = "secondary-button preview-toggle";
  toggleBtn.type = "button";
  toggleBtn.textContent = "Expand";
  toggleBtn.setAttribute("aria-expanded", "false");
  previewContainer.after(toggleBtn);

  let expanded = false;
  function updateToggle() {
    const needsToggle = previewEl.scrollHeight > 300;
    toggleBtn.hidden = !needsToggle;
    if (!needsToggle) {
      expanded = false;
      previewContainer.classList.remove("expanded");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.textContent = "Expand";
    }
  }

  toggleBtn.addEventListener("click", () => {
    expanded = !expanded;
    previewContainer.classList.toggle("expanded", expanded);
    toggleBtn.textContent = expanded ? "Collapse" : "Expand";
    toggleBtn.setAttribute("aria-expanded", String(expanded));
  });

  updateToggle();

  let data;
  try {
    const json = await fetchJson(`${DATA_DIR}tooltips.json`);
    data = flattenTooltips(json);
  } catch (err) {
    console.error("Failed to load tooltips", err);
    const status = err?.status ?? err?.response?.status;
    if (err?.code === "ENOENT" || status === 404) {
      previewEl.textContent = FILE_NOT_FOUND_MSG;
    } else if (err instanceof SyntaxError) {
      const pos = extractLineAndColumn(err);
      if (pos) {
        previewEl.textContent = `Line ${pos.line}, Column ${pos.column}`;
      } else {
        previewEl.textContent = LOAD_ERROR_MSG;
      }
    } else {
      previewEl.textContent = LOAD_ERROR_MSG;
    }
    return;
  }

  let listSelect;

  function renderList(filter = "") {
    const items = [];
    const terms = filter.toLowerCase().split(/\s+/).filter(Boolean);
    Object.entries(data).forEach(([key, body]) => {
      const haystack = `${key} ${body}`.toLowerCase();
      const match = terms.every((t) => haystack.includes(t));
      if (match) {
        const bodyValid = typeof body === "string" && body.trim().length > 0;
        const keyValid = KEY_PATTERN.test(key);
        const valid = bodyValid && keyValid;
        const { warning } = parseTooltipText(body);
        const prefix = key.split(".")[0];
        items.push({
          label: key,
          className: prefix,
          dataset: {
            key,
            body,
            valid: String(valid),
            warning: String(warning),
            keyValid: String(keyValid)
          }
        });
      }
    });
    const result = createSidebarList(items, (_, el) => {
      select(el.dataset.key);
    });
    Array.from(result.element.children).forEach((li) => {
      let message = null;
      if (li.dataset.keyValid === "false") {
        message = INVALID_KEY_MSG;
      } else if (li.dataset.valid === "false") {
        message = INVALID_TOOLTIP_MSG;
      } else if (li.dataset.warning === "true") {
        message = MALFORMED_TOOLTIP_MSG;
      }
      if (message) {
        const icon = document.createElement("span");
        icon.className = "tooltip-invalid-icon";
        icon.textContent = "!";
        icon.title = message;
        icon.setAttribute("aria-hidden", "true");
        const sr = document.createElement("span");
        sr.className = "tooltip-invalid-text";
        sr.textContent = message;
        li.append(" ", icon, sr);
      }
    });
    listSelect = result.select;
    result.element.id = "tooltip-list";
    listPlaceholder.replaceWith(result.element);
    listPlaceholder = result.element;
  }

  let selectedKey;
  function select(key) {
    if (selectedKey === key) return;
    selectedKey = key;
    const body = data[key] ?? "";
    if (listSelect) {
      const index = Array.from(listPlaceholder.children).findIndex((el) => el.dataset.key === key);
      if (index !== -1) listSelect(index);
    }
    const { html, warning } = parseTooltipText(body);
    previewEl.innerHTML = html;
    rawEl.textContent = body;
    if (warning) {
      warningEl.textContent = MALFORMED_TOOLTIP_MSG;
      warningEl.hidden = false;
    } else {
      warningEl.textContent = "";
      warningEl.hidden = true;
    }
    keyCopyBtn.dataset.copy = key;
    bodyCopyBtn.dataset.copy = body;
    previewEl.classList.remove("fade-in");
    void previewEl.offsetWidth;
    previewEl.classList.add("fade-in");
    expanded = false;
    previewContainer.classList.remove("expanded");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.textContent = "Expand";
    updateToggle();
  }

  function copy(btn) {
    const text = btn.dataset.copy || "";
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showSnackbar("Copied");
          btn.classList.add("copied");
          setTimeout(() => btn.classList.remove("copied"), 600);
        })
        .catch(() => {});
    }
  }

  keyCopyBtn.addEventListener("click", () => copy(keyCopyBtn));
  bodyCopyBtn.addEventListener("click", () => copy(bodyCopyBtn));

  let timer;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => renderList(searchInput.value), 300);
  });

  renderList();
  if (location.hash) {
    const key = decodeURIComponent(location.hash.slice(1));
    const el = listPlaceholder.querySelector(`[data-key="${key}"]`);
    if (el) {
      select(key);
      el.scrollIntoView({ block: "center" });
    }
  }

  initTooltips();
}

onDomReady(setupTooltipViewerPage);
