import { fetchJson } from "./dataUtils.js";
import { parseTooltipText, flattenTooltips, initTooltips } from "./tooltip.js";
import { DATA_DIR } from "./constants.js";
import { onDomReady } from "./domReady.js";
import { showSnackbar } from "./showSnackbar.js";
import { PreviewToggle } from "../components/PreviewToggle.js";
import { extractLineAndColumn } from "./tooltipViewer/extractLineAndColumn.js";
import { renderList, MALFORMED_TOOLTIP_MSG } from "./tooltipViewer/renderList.js";

const FILE_NOT_FOUND_MSG = "File not found";
const LOAD_ERROR_MSG = "Error loading tooltips.";

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
  const previewToggle = new PreviewToggle(previewEl);

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

  function updateList(filter = "") {
    const { element, listSelect: selectFn } = renderList(data, filter, select, listPlaceholder);
    listPlaceholder = element;
    listSelect = selectFn;
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
    previewToggle.reset();
    previewToggle.update();
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
    timer = setTimeout(() => updateList(searchInput.value), 300);
  });

  updateList();
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
