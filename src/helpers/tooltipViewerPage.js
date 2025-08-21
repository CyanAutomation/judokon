import { parseTooltipText, flattenTooltips, initTooltips } from "./tooltip.js";
import { DATA_DIR } from "./constants.js";
import { onDomReady } from "./domReady.js";
import { PreviewToggle } from "../components/PreviewToggle.js";
import { extractLineAndColumn } from "./tooltipViewer/extractLineAndColumn.js";
import { renderList, MALFORMED_TOOLTIP_MSG } from "./tooltipViewer/renderList.js";
import { getSanitizer } from "./sanitizeHtml.js";

const FILE_NOT_FOUND_MSG = "File not found";
const LOAD_ERROR_MSG = "Error loading tooltips.";
// Test hooks for dependency injection
let snackbarFnOverride = null;
export function setTooltipSnackbar(fn) {
  snackbarFnOverride = typeof fn === "function" ? fn : null;
}

// Optional injection hook used by tests to bypass module resolution quirks
/** @type {null | ((url: string) => Promise<Record<string, any>>)} */
let tooltipDataLoader = null;
export function setTooltipDataLoader(fn) {
  tooltipDataLoader = typeof fn === "function" ? fn : null;
}

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
    const url = `${DATA_DIR}tooltips.json`;
    let json;
    if (tooltipDataLoader) {
      json = await tooltipDataLoader(url);
    } else {
      // Load via dynamic import so Vitest mocks apply when present
      const { fetchJson } = await import("./dataUtils.js");
      json = await fetchJson(url);
    }
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
 * 3. Return a cleanup function to clear the timer and remove the listener.
 *
 * @param {HTMLInputElement} searchInput - Search box element.
 * @param {(filter: string) => void} updateList - Callback to refresh the list.
 * @returns {() => void} Cleanup function.
 */
export function initSearchFilter(searchInput, updateList) {
  let timer;
  const handler = () => {
    clearTimeout(timer);
    timer = setTimeout(() => updateList(searchInput.value), 300);
  };
  searchInput.addEventListener("input", handler);
  return () => {
    clearTimeout(timer);
    searchInput.removeEventListener("input", handler);
  };
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
  // Use dynamic import so tests can vi.doMock this module after initial import
  let snackbarPromise;
  const getSnackbar = () => {
    snackbarPromise ||= import("./showSnackbar.js");
    return snackbarPromise;
  };
  function copy(btn) {
    const text = btn.dataset.copy || "";
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          if (snackbarFnOverride) {
            try {
              snackbarFnOverride("Copied");
            } catch {}
          } else {
            getSnackbar()
              .then(({ showSnackbar }) => showSnackbar("Copied"))
              .catch(() => {});
          }
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
 * 1. Read and decode the URL hash; exit if decoding fails.
 * 2. Find the matching list item and invoke `select`.
 * 3. Scroll the element into view when found.
 *
 * @param {HTMLElement} listPlaceholder - List element containing tooltip items.
 * @param {(key: string) => void} select - Selection callback.
 */
export function applyHashSelection(listPlaceholder, select) {
  if (location.hash) {
    let key;
    try {
      key = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
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
 * 4. Bind copy buttons, warm the snackbar module, and set up search filtering.
 * 5. Apply URL hash selection, then initialize help tooltips.
 * 6. Clean up search filtering on `pagehide`.
 */
export async function setupTooltipViewerPage() {
  // Start loading sanitizer but don't block initial render
  const sanitizerPromise = getSanitizer();
  let sanitize = (s) => s;
  sanitizerPromise
    .then((DOMPurify) => {
      if (DOMPurify?.sanitize) sanitize = DOMPurify.sanitize.bind(DOMPurify);
    })
    .catch(() => {});
  const searchInput = document.getElementById("tooltip-search");
  let listPlaceholder = document.getElementById("tooltip-list");
  const previewEl = document.getElementById("tooltip-preview");
  const rawEl = document.getElementById("tooltip-raw");
  const warningEl = document.getElementById("tooltip-warning");
  const keyCopyBtn = document.getElementById("copy-key-btn");
  const bodyCopyBtn = document.getElementById("copy-body-btn");
  // If essential elements are missing (e.g., during unrelated pages/tests), bail out early.
  if (
    !searchInput ||
    !listPlaceholder ||
    !previewEl ||
    !rawEl ||
    !warningEl ||
    !keyCopyBtn ||
    !bodyCopyBtn
  ) {
    return;
  }
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
    previewEl.innerHTML = sanitize(html);
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
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => import("./showSnackbar.js").catch(() => {}));
  }
  const cleanupSearch = initSearchFilter(searchInput, updateList);
  window.addEventListener("pagehide", cleanupSearch, { once: true });

  updateList();
  applyHashSelection(listPlaceholder, select);
  initTooltips();
}

onDomReady(setupTooltipViewerPage);
