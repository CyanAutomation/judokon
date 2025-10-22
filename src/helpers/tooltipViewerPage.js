import { parseTooltipText, flattenTooltips, initTooltips } from "./tooltip.js";
import { DATA_DIR } from "./constants.js";
import { onDomReady } from "./domReady.js";
import { extractLineAndColumn } from "./tooltipViewer/extractLineAndColumn.js";
import { renderList, MALFORMED_TOOLTIP_MSG } from "./tooltipViewer/renderList.js";
import { getSanitizer } from "./sanitizeHtml.js";

const FILE_NOT_FOUND_MSG = "File not found";
const LOAD_ERROR_MSG = "Error loading tooltips.";
const PREVIEW_COLLAPSE_THRESHOLD = 300;
// Test hooks for dependency injection
let snackbarFnOverride = null;

/**
 * Inject a snackbar function used by the tooltip viewer for user messages.
 *
 * @pseudocode
 * 1. If `fn` is a function, store it in the internal override slot.
 * 2. If `fn` is not a function (or null), clear the override so the
 *    normal dynamic-imported snackbar is used.
 *
 * @param {(message: string) => void|null} fn - Custom snackbar function or null.
 * @returns {void}
 */
export function setTooltipSnackbar(fn) {
  snackbarFnOverride = typeof fn === "function" ? fn : null;
}

// Optional injection hook used by tests to bypass module resolution quirks
/** @type {null | ((url: string) => Promise<Record<string, any>>)} */
let tooltipDataLoader = null;

/**
 * Inject a custom loader for `tooltips.json` used in the tooltip viewer.
 *
 * @pseudocode
 * 1. If `fn` is a function, store it and use it to fetch the JSON during
 *    `loadTooltipData`.
 * 2. If `fn` is falsy, clear the override so normal dynamic import/fetch is used.
 *
 * @param {(url: string) => Promise<Record<string, any>>|null} fn - Loader function or null.
 * @returns {void}
 */
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
 * 2. Set a new timer to update the list after `debounceMs` (300ms default).
 * 3. Return a cleanup function to clear the timer and remove the listener.
 *
 * @param {HTMLInputElement} searchInput - Search box element.
 * @param {(filter: string) => void} updateList - Callback to refresh the list.
 * @param {number} [debounceMs=300] - Delay in milliseconds before updating.
 * @returns {() => void} Cleanup function.
 */
export function initSearchFilter(searchInput, updateList, debounceMs = 300) {
  let timer;
  const handler = () => {
    clearTimeout(timer);
    timer = setTimeout(() => updateList(searchInput.value), debounceMs);
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
 * 1. Detect clipboard support; when absent and no fallback exists, disable the buttons and notify the user.
 * 2. On click, copy the `data-copy` text using `navigator.clipboard` or a temporary `textarea` fallback.
 * 3. If copying succeeds, show "Copied" and add a temporary `copied` class for feedback.
 * 4. Remove the `copied` class after `removeDelayMs` (600ms default).
 * 5. When copying fails, inform the user that copying isn't supported.
 *
 * @param {HTMLElement} keyCopyBtn - Button element used to copy the tooltip key.
 * @param {HTMLElement} bodyCopyBtn - Button element used to copy the tooltip body text.
 * @param {number} [removeDelayMs=600] - Milliseconds before removing the visual `copied` feedback.
 * @returns {void}
 */
export function bindCopyButtons(keyCopyBtn, bodyCopyBtn, removeDelayMs = 600) {
  // Use dynamic import so tests can vi.doMock this module after initial import
  let snackbarPromise;
  const getSnackbar = () => {
    snackbarPromise ||= import("./showSnackbar.js");
    return snackbarPromise;
  };
  const supportsClipboard = typeof navigator !== "undefined" && !!navigator.clipboard?.writeText;
  const supportsExecCommand =
    typeof document !== "undefined" &&
    typeof document.execCommand === "function" &&
    (!document.queryCommandSupported || document.queryCommandSupported("copy"));

  function showMessage(message) {
    if (snackbarFnOverride) {
      try {
        snackbarFnOverride(message);
      } catch {}
    } else {
      getSnackbar()
        .then(({ showSnackbar }) => showSnackbar(message))
        .catch(() => {});
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    textarea.remove();
    return ok;
  }

  if (!supportsClipboard && !supportsExecCommand) {
    keyCopyBtn.disabled = true;
    bodyCopyBtn.disabled = true;
    showMessage("Copying not supported");
    return;
  }

  async function copy(btn) {
    const text = btn.dataset.copy || "";
    let success = false;
    if (supportsClipboard) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch {
        success = false;
      }
    } else if (supportsExecCommand) {
      success = fallbackCopy(text);
    }
    if (success) {
      showMessage("Copied");
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), removeDelayMs);
    } else {
      showMessage("Copying not supported");
    }
  }

  keyCopyBtn.addEventListener("click", () => void copy(keyCopyBtn));
  bodyCopyBtn.addEventListener("click", () => void copy(bodyCopyBtn));
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Select and scroll to the list item referenced by `location.hash`.
 *
 * @pseudocode
 * 1. Read the current URL hash and decode it to a key; return early on decode errors.
 * 2. Attempt to find the DOM element with `data-key` matching the key.
 * 3. If the element is found, call `select(key)` and scroll it into view.
 *
 * @param {HTMLElement} listPlaceholder - List element containing tooltip items.
 * @param {(key: string) => void} select - Selection callback.
 */
/**
 * Select and scroll to the list item referenced by `location.hash`.
 *
 * @pseudocode
 * 1. Read the current URL hash and decode it to a key; return early on decode errors.
 * 2. Attempt to find the DOM element with `data-key` matching the key.
 * 3. If the element is found, call `select(key)` and scroll it into view.
 *
 * @param {HTMLElement} listPlaceholder - List element containing tooltip items.
 * @param {(key: string) => void} select - Selection callback.
 * @returns {void}
 */
export function applyHashSelection(listPlaceholder, select) {
  if (location.hash) {
    let key;
    try {
      key = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    let el = null;
    try {
      if (typeof key !== "string") {
        try {
          if (typeof window !== "undefined")
            window.__classicBattleQuerySelectorError = {
              key,
              where: "tooltipViewer.applyHashSelection"
            };
        } catch {}
      } else {
        el = listPlaceholder.querySelector(`[data-key="${key}"]`);
      }
    } catch (e) {
      try {
        if (typeof window !== "undefined")
          window.__classicBattleQuerySelectorError = {
            key,
            where: "tooltipViewer.applyHashSelection",
            err: String(e)
          };
      } catch {}
    }
    if (el) {
      select(key);
      el.scrollIntoView({ block: "center" });
    }
  }
}

function createPreviewSummary() {
  const summary = document.createElement("summary");
  summary.className = "preview-summary";
  const closedLabel = document.createElement("span");
  closedLabel.className = "summary-label summary-label--closed";
  closedLabel.textContent = "Expand preview";
  const openLabel = document.createElement("span");
  openLabel.className = "summary-label summary-label--open";
  openLabel.textContent = "Collapse preview";
  summary.append(closedLabel, openLabel);
  return summary;
}

/**
 * Initialize the Tooltip Viewer page.
 *
 * @pseudocode
 * 1. Hydrate the preview `<details>` container and prepare overflow measurement.
 * 2. Load tooltip data with {@link loadTooltipData}; exit on failure.
 * 3. Render and filter the list, updating the preview on selection.
 * 4. Bind copy buttons, warm the snackbar module, and set up search filtering.
 * 5. Apply URL hash selection, then initialize help tooltips.
 * 6. Clean up search filtering and measurement listeners on `pagehide`.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Initialize the Tooltip Viewer page.
 *
 * @pseudocode
 * 1. Prepare DOM references and start loading the sanitizer asynchronously.
 * 2. Load tooltip data via `loadTooltipData`; abort if loading fails.
 * 3. Render the list and wire selection handling to update preview and raw text.
 * 4. Bind copy buttons and initialize search filtering with debounce.
 * 5. Apply hash selection and initialize general tooltips for help icons.
 * 6. Register cleanup for search filtering on page hide.
 *
 * @param {object} [options]
 * @param {number} [options.debounceMs=300]
 * @param {number} [options.removeDelayMs=600]
 * @returns {Promise<void>}
 */
export async function setupTooltipViewerPage({ debounceMs = 300, removeDelayMs = 600 } = {}) {
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
  let previewContainer = document.getElementById("tooltip-preview-container");
  const rawEl = document.getElementById("tooltip-raw");
  const warningEl = document.getElementById("tooltip-warning");
  const keyCopyBtn = document.getElementById("copy-key-btn");
  const bodyCopyBtn = document.getElementById("copy-body-btn");
  // If essential elements are missing (e.g., during unrelated pages/tests), bail out early.
  if (
    !searchInput ||
    !listPlaceholder ||
    !previewEl ||
    !previewEl.parentNode ||
    !rawEl ||
    !warningEl ||
    !keyCopyBtn ||
    !bodyCopyBtn
  ) {
    return;
  }
  if (!previewContainer) {
    previewContainer = document.createElement("details");
    previewContainer.id = "tooltip-preview-container";
    previewContainer.className = "preview-container";
    const summary = createPreviewSummary();
    previewContainer.append(summary);
    previewEl.parentNode.insertBefore(previewContainer, previewEl);
    previewContainer.append(previewEl);
  } else {
    if (!previewContainer.querySelector("summary")) {
      previewContainer.insertBefore(createPreviewSummary(), previewContainer.firstChild);
    }
    if (!previewContainer.contains(previewEl)) {
      previewContainer.append(previewEl);
    }
  }

  let previewMeasureTimer = null;
  const clearPreviewMeasurement = () => {
    if (previewMeasureTimer !== null) {
      clearTimeout(previewMeasureTimer);
      previewMeasureTimer = null;
    }
  };

  const schedulePreviewMeasurement = () => {
    clearPreviewMeasurement();
    previewMeasureTimer = setTimeout(() => {
      previewMeasureTimer = null;
      const collapsible = previewEl.scrollHeight > PREVIEW_COLLAPSE_THRESHOLD;
      previewContainer.dataset.collapsible = collapsible ? "true" : "false";
      if (collapsible) {
        previewContainer.open = false;
      } else {
        previewContainer.open = true;
      }
    }, 0);
  };

  const handleResize = () => schedulePreviewMeasurement();
  window.addEventListener("resize", handleResize);

  const data = await loadTooltipData(previewEl);
  if (!data) {
    clearPreviewMeasurement();
    window.removeEventListener("resize", handleResize);
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
    if (previewContainer.dataset.collapsible !== "false") {
      previewContainer.open = false;
    }
    schedulePreviewMeasurement();
  }

  bindCopyButtons(keyCopyBtn, bodyCopyBtn, removeDelayMs);
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => import("./showSnackbar.js").catch(() => {}));
  }
  const cleanupSearch = initSearchFilter(searchInput, updateList, debounceMs);
  const handlePageHide = () => {
    cleanupSearch();
    clearPreviewMeasurement();
    window.removeEventListener("resize", handleResize);
  };
  window.addEventListener("pagehide", handlePageHide, { once: true });

  updateList();
  schedulePreviewMeasurement();
  applyHashSelection(listPlaceholder, select);
  initTooltips();
}

let initPromise;
/**
 * Factory to initialize the Tooltip Viewer page and expose a ready promise.
 *
 * @pseudocode
 * 1. If initialization hasn't started, call {@link setupTooltipViewerPage} with the provided options.
 * 2. Store and return the resulting promise.
 *
 * @param {object} [options] - Options forwarded to {@link setupTooltipViewerPage}.
 * @returns {Promise<void>} Resolves once initialization completes.
 */
export function initTooltipViewerPage(options) {
  if (!initPromise) {
    initPromise = setupTooltipViewerPage(options);
  }
  return initPromise;
}

onDomReady(initTooltipViewerPage);
