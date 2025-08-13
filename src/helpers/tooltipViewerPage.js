import { fetchJson } from "./dataUtils.js";
import { parseTooltipText, flattenTooltips, initTooltips } from "./tooltip.js";
import { DATA_DIR } from "./constants.js";
import { onDomReady } from "./domReady.js";
import { showSnackbar } from "./showSnackbar.js";
import { PreviewToggle } from "../components/PreviewToggle.js";
import { extractLineAndColumn } from "./tooltipViewer/extractLineAndColumn.js";
import { renderList, MALFORMED_TOOLTIP_MSG } from "./tooltipViewer/renderList.js";
import { getSanitizer } from "./sanitizeHtml.js";

const FILE_NOT_FOUND_MSG = "File not found";
const LOAD_ERROR_MSG = "Error loading tooltips.";

/**
 * Load and flatten `tooltips.json`, displaying errors in the preview element.
 *
 * @pseudocode
 * 1. Attempt to fetch and flatten the tooltip JSON.
 * 2. When the file is missing, show "File not found".
 * 3. For JSON parse errors, extract and display line/column details.
 * 4. On other failures, show a generic loading error.
 * 5. Return the flattened data or `null` when loading fails.
 *
 * @param {HTMLElement} previewEl - Element used to display error messages.
 * @returns {Promise<Record<string,string>|null>}
 */
export async function loadTooltipData(previewEl) {
  try {
    const json = await fetchJson(`${DATA_DIR}tooltips.json`);
    return flattenTooltips(json);
  } catch (err) {
    console.error("Failed to load tooltips", err);
    const status = err?.status ?? err?.response?.status;
    if (err?.code === "ENOENT" || status === 404) {
      previewEl.textContent = FILE_NOT_FOUND_MSG;
    } else if (err instanceof SyntaxError) {
      const pos = extractLineAndColumn(err);
      previewEl.textContent = pos ? `Line ${pos.line}, Column ${pos.column}` : LOAD_ERROR_MSG;
    } else {
      previewEl.textContent = LOAD_ERROR_MSG;
    }
    return null;
  }
}

/**
 * Initialize debounced search filtering on the tooltip list.
 *
 * @pseudocode
 * 1. On each input event, clear the previous debounce timer.
 * 2. Set a new timer to update the list after 300ms.
 *
 * @param {HTMLInputElement} searchInput - Search box element.
 * @param {(filter: string) => void} updateList - Callback to refresh the list.
 */
export function initSearchFilter(searchInput, updateList) {
  let timer;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => updateList(searchInput.value), 300);
  });
}

/**
 * Attach copy-to-clipboard behavior to the key and body buttons.
 *
 * @pseudocode
 * 1. When a button is clicked, write its `data-copy` text to the clipboard.
 * 2. Show a "Copied" snackbar and add a temporary `copied` class for feedback.
 *
 * @param {HTMLButtonElement} keyCopyBtn - Button for copying the key.
 * @param {HTMLButtonElement} bodyCopyBtn - Button for copying the body.
 */
export function bindCopyButtons(keyCopyBtn, bodyCopyBtn) {
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
}

/**
 * Select and scroll to the list item referenced by `location.hash`.
 *
 * @pseudocode
 * 1. Read and decode the URL hash.
 * 2. Find the matching list item and invoke `select`.
 * 3. Scroll the element into view when found.
 *
 * @param {HTMLElement} listPlaceholder - List element containing tooltip items.
 * @param {(key: string) => void} select - Selection callback.
 */
export function applyHashSelection(listPlaceholder, select) {
  if (location.hash) {
    const key = decodeURIComponent(location.hash.slice(1));
    const el = listPlaceholder.querySelector(`[data-key="${key}"]`);
    if (el) {
      select(key);
      el.scrollIntoView({ block: "center" });
    }
  }
}

/**
 * Initialize the Tooltip Viewer page.
 *
 * @pseudocode
 * 1. Grab DOM references and instantiate `PreviewToggle`.
 * 2. Load tooltip data with {@link loadTooltipData}; exit on failure.
 * 3. Render and filter the list, updating the preview on selection.
 * 4. Bind copy buttons and search filtering.
 * 5. Apply URL hash selection, then initialize help tooltips.
 */
export async function setupTooltipViewerPage() {
  const DOMPurify = await getSanitizer();
  const searchInput = document.getElementById("tooltip-search");
  let listPlaceholder = document.getElementById("tooltip-list");
  const previewEl = document.getElementById("tooltip-preview");
  const rawEl = document.getElementById("tooltip-raw");
  const warningEl = document.getElementById("tooltip-warning");
  const keyCopyBtn = document.getElementById("copy-key-btn");
  const bodyCopyBtn = document.getElementById("copy-body-btn");
  const previewToggle = new PreviewToggle(previewEl);

  const data = await loadTooltipData(previewEl);
  if (!data) return;

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
    previewEl.innerHTML = DOMPurify.sanitize(html);
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

  bindCopyButtons(keyCopyBtn, bodyCopyBtn);
  initSearchFilter(searchInput, updateList);

  updateList();
  applyHashSelection(listPlaceholder, select);
  initTooltips();
}

onDomReady(setupTooltipViewerPage);
