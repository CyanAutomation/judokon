import { onDomReady } from "./domReady.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { initTooltips } from "./tooltip.js";
import { SidebarList } from "../components/SidebarList.js";
import { getPrdTaskStats } from "./prdTaskStats.js";
import { getSanitizer } from "./sanitizeHtml.js";
import { createSpinner } from "../components/Spinner.js";
import { getFeatureFlag } from "../helpers/settingsCache.js";
import { pushHistory, replaceHistory, bindHistory } from "./prdReader/history.js";

export class SidebarState {
  /**
   * @param {object} opts
   */
  constructor(opts) {
    Object.assign(this, opts);
  }

  /**
   * Update sidebar index and optionally render and focus.
   *
   * @param {number} i
   * @param {boolean} [skipList=false]
   * @param {boolean} [focusContent=true]
   */
  selectDoc(i, skipList = false, focusContent = true) {
    this.index = ((i % this.files.length) + this.files.length) % this.files.length;
    if (!skipList && this.listSelect) this.listSelect(this.index);
    const hadDoc = this.ensureDocSync(this.index);
    const done = () => this.renderAndFocus(focusContent);
    if (hadDoc) done();
    else this.fetchOne(this.index).then(done);
  }

  /**
   * Push current document to history.
   */
  updateHistory() {
    pushHistory(this.baseNames, this.index);
  }

  /**
   * Render current document and optionally focus container.
   *
   * @param {boolean} [focusContent=true]
   */
  renderAndFocus(focusContent = true) {
    renderDocument(this, this.index);
    if (focusContent) this.container.focus();
  }

  /**
   * Select a document by index and optionally update history.
   *
   * @param {number} i
   * @param {boolean} [updateHistory=true]
   * @param {boolean} [skipList=false]
   * @param {boolean} [focusContent=true]
   */
  selectDocSync(i, updateHistory = true, skipList = false, focusContent = true) {
    this.selectDoc(i, skipList, focusContent);
    if (updateHistory) this.updateHistory();
  }
}

let cleanupTooltips = () => {};

/**
 * Load PRD filenames and related metadata.
 *
 * @pseudocode
 * 1. Build the PRD directory from `BASE_URL`.
 * 2. Derive file list from `docsMap`, `import.meta.glob`, or `prdIndex.json`.
 * 3. Sort filenames and compute base names and labels.
 * 4. Return filenames, base names, labels, and directory path.
 *
 * @param {Record<string, string>} [docsMap]
 * @returns {Promise<{files:string[], baseNames:string[], labels:string[], dir:string}>}
 */
export async function loadPrdFileList(docsMap) {
  const base = (import.meta?.env?.BASE_URL ?? "/").replace(/\/?$/, "/");
  const dir = `${base}design/productRequirementsDocuments/`;
  let files = [];
  if (docsMap) files = Object.keys(docsMap);
  else if (typeof import.meta.glob === "function") {
    files = Object.keys(import.meta.glob("../../design/productRequirementsDocuments/*.md")).map(
      (p) => p.split("/").pop()
    );
  } else {
    try {
      const res = await fetch(`${dir}prdIndex.json`);
      files = (await res.json()) || [];
    } catch {
      files = [];
    }
  }
  files.sort((a, b) => a.localeCompare(b));
  const baseNames = files.map((f) => f.replace(/\.md$/, ""));
  const labels = files.map((file) =>
    file
      .replace(/^prd/, "")
      .replace(/\.md$/, "")
      .replace(/([A-Z])/g, " $1")
      .trim()
  );
  return { files, baseNames, labels, dir };
}

/**
 * Create a sidebar list and replace the placeholder element.
 *
 * @pseudocode
 * 1. Instantiate `SidebarList` with labels and `onSelect` handler.
 * 2. Replace the placeholder with the new list element.
 * 3. Return the bound `select` function for external control.
 *
 * @param {string[]} labels
 * @param {HTMLElement} placeholder
 * @param {(i:number, el:HTMLElement, opts?:object) => void} onSelect
 * @returns {{ listSelect:(i:number)=>void }}
 */
export function createSidebarList(labels, placeholder, onSelect) {
  const list = new SidebarList(labels, onSelect);
  const listEl = list.element;
  listEl.id = "prd-list";
  placeholder.replaceWith(listEl);
  return { listSelect: list.select.bind(list) };
}

/**
 * Binds navigation events (click, keyboard, touch) for browsing PRD documents.
 *
 * @summary This function sets up event listeners on navigation buttons,
 * keyboard keys, and touch gestures to allow users to move between PRD documents.
 *
 * @pseudocode
 * 1. Attach `click` event listeners to each `nextButtons` element, calling `showNext` when clicked.
 * 2. Attach `click` event listeners to each `prevButtons` element, calling `showPrev` when clicked.
 * 3. Define a `keydown` handler: if the active element is the `container` and the key is `ArrowRight`, call `showNext`; if `ArrowLeft`, call `showPrev`.
 * 4. Define `touchstart` and `touchend` handlers for swipe gestures on the `container`:
 *    a. On `touchstart`, record the `clientX` of the first touch.
 *    b. On `touchend`, calculate the horizontal difference (`diff`). If `abs(diff)` is greater than 30 pixels, call `showNext` for left swipe (`diff < 0`) or `showPrev` for right swipe.
 * 5. Create an `eventMap` array to store event listener configurations (target, type, handler).
 * 6. Iterate through `eventMap` and add each event listener to its respective target.
 *
 * @param {object} opts - Options object containing elements and callbacks.
 * @param {HTMLElement} opts.container - The main container element for PRD content, used for keyboard and touch events.
 * @param {NodeListOf<HTMLElement>} opts.nextButtons - A NodeList of elements that trigger navigation to the next document.
 * @param {NodeListOf<HTMLElement>} opts.prevButtons - A NodeList of elements that trigger navigation to the previous document.
 * @param {Function} opts.showNext - Callback function to display the next document.
 * @param {Function} opts.showPrev - Callback function to display the previous document.
 * @returns {void}
 */
export function bindNavigation({ container, nextButtons, prevButtons, showNext, showPrev }) {
  nextButtons.forEach((btn) => btn.addEventListener("click", showNext));
  prevButtons.forEach((btn) => btn.addEventListener("click", showPrev));
  let startX = 0;
  const handlers = {
    keydown: (e) => {
      if (document.activeElement !== container) return;
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    },
    touchstart: (e) => {
      startX = e.touches[0].clientX;
    },
    touchend: (e) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 30) diff < 0 ? showNext() : showPrev();
    }
  };
  const eventMap = [
    { target: document, type: "keydown", handler: handlers.keydown },
    { target: container, type: "touchstart", handler: handlers.touchstart },
    { target: container, type: "touchend", handler: handlers.touchend }
  ];
  eventMap.forEach(({ target, type, handler }) => target.addEventListener(type, handler));
}

/**
 * Renders the specified PRD document into the content area and updates
 * associated UI elements like the title and task summary.
 *
 * @summary This function is responsible for displaying the content of a PRD
 * document, sanitizing its HTML, and updating the page's metadata.
 *
 * @pseudocode
 * 1. Destructure necessary properties from the `state` object: `container`, `titles`, `taskStats`, `titleEl`, `summaryEl`, `documents`, and `DOMPurify`.
 * 2. Call `cleanupTooltips()` to remove any tooltips from the previously rendered document.
 * 3. Sanitize the HTML content of the document at the given `index` using `DOMPurify.sanitize()` and set it as the `innerHTML` of the `container`.
 * 4. Trigger a fade-in animation for the `container`: remove `fade-in` class, force reflow, then add `fade-in` class.
 * 5. If `titleEl` exists, set its `textContent` to the title of the document at `index`.
 * 6. If `summaryEl` exists, calculate and display the task completion summary (e.g., "Tasks: completed/total (percent%)").
 * 7. Initialize tooltips within the `container` and store the returned cleanup function in `cleanupTooltips`.
 *
 * @param {SidebarState} state - The state object containing document data and UI element references.
 * @param {number} index - The index of the document to render within the `documents` array.
 * @returns {void}
 */
export function renderDocument(state, index) {
  const { container, titles, taskStats, titleEl, summaryEl, documents, DOMPurify } = state;
  cleanupTooltips();
  container.innerHTML = DOMPurify.sanitize(documents[index] || "");
  container.classList.remove("fade-in");
  void container.offsetWidth;
  container.classList.add("fade-in");
  if (titleEl) titleEl.textContent = titles[index] || "";
  if (summaryEl) {
    const { total, completed } = taskStats[index] || { total: 0, completed: 0 };
    const percent = total ? Math.round((completed / total) * 100) : 0;
    summaryEl.textContent = `Tasks: ${completed}/${total} (${percent}%)`;
  }
  initTooltips(container).then((fn) => {
    cleanupTooltips = fn;
  });
}

/**
 * Load documents and prepare parsing helpers.
 *
 * @pseudocode
 * 1. Gather filenames and metadata via `loadPrdFileList`.
 * 2. Allocate caches for documents, task stats, titles, and pending fetches.
 * 3. Define `fetchOne` and `ensureDocSync` helpers for markdown retrieval.
 * 4. Return loaded metadata and helpers for UI setup.
 *
 * @param {Record<string,string>} [docsMap]
 * @param {Function} [parserFn]
 * @returns {Promise<object>}
 */
export async function loadPrdDocs(docsMap, parserFn = markdownToHtml) {
  const { files, baseNames, labels, dir } = await loadPrdFileList(docsMap);
  const DOMPurify = await getSanitizer();
  const documents = Array(files.length);
  const taskStats = Array(files.length);
  const titles = Array(files.length);
  const pending = Array(files.length);

  const escapeHtml = (str) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const parseWithWarning = (md) => {
    try {
      return DOMPurify.sanitize(parserFn(md));
    } catch {
      const escaped = escapeHtml(md);
      return (
        '<div class="markdown-warning" role="alert" aria-label="Content could not be fully rendered" title="Content could not be fully rendered">⚠️ Partial content</div>' +
        `<pre>${escaped}</pre>`
      );
    }
  };

  const fetchOne = async (i) => {
    if (documents[i]) return;
    if (pending[i]) return pending[i];
    pending[i] = (async () => {
      try {
        let md;
        const name = files[i];
        if (docsMap && docsMap[name]) {
          md = docsMap[name];
        } else {
          const res = await fetch(`${dir}${name}`);
          if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${name}`);
          md = await res.text();
        }
        documents[i] = parseWithWarning(md);
        taskStats[i] = getPrdTaskStats(md);
        const m = md.match(/^#\s*(.+)/m);
        titles[i] = m ? m[1].trim() : "";
      } catch (err) {
        console.error(`Failed to load PRD ${files[i]}`, err);
        documents[i] =
          '<div class="warning" role="alert" aria-live="polite">Content unavailable</div>';
        taskStats[i] = { total: 0, completed: 0 };
        titles[i] = "";
      } finally {
        pending[i] = null;
      }
    })();
    return pending[i];
  };

  const ensureDocSync = (i) => {
    if (documents[i]) return true;
    const name = files[i];
    if (docsMap && docsMap[name]) {
      const md = docsMap[name];
      documents[i] = parseWithWarning(md);
      taskStats[i] = getPrdTaskStats(md);
      const m = md.match(/^#\s*(.+)/m);
      titles[i] = m ? m[1].trim() : "";
      return true;
    }
    return false;
  };

  return {
    files,
    baseNames,
    labels,
    dir,
    documents,
    taskStats,
    titles,
    pending,
    fetchOne,
    ensureDocSync,
    DOMPurify,
    docsMap,
    parserFn
  };
}

/**
 * Setup sidebar UI and return sidebar state.
 *
 * @pseudocode
 * 1. Resolve DOM elements and derive starting index from URL.
 * 2. Instantiate `SidebarState` with provided document data.
 * 3. Replace the placeholder list with sidebar component and bind selection.
 * 4. Return the configured `SidebarState` instance.
 *
 * @param {object} docData
 * @returns {SidebarState|null}
 */
export function setupSidebarUI(docData) {
  const { files, baseNames, labels } = docData;
  const container = document.getElementById("prd-content");
  const listPlaceholder = document.getElementById("prd-list");
  const titleEl = document.getElementById("prd-title");
  const summaryEl = document.getElementById("task-summary");
  if (!container || !listPlaceholder || !files.length) return null;
  const spinner = createSpinner(container.parentElement);
  const docParam = new URLSearchParams(window.location.search).get("doc");
  const startIndex = Math.max(0, docParam ? baseNames.indexOf(docParam.replace(/\.md$/, "")) : 0);

  const state = new SidebarState({
    ...docData,
    container,
    titleEl,
    summaryEl,
    spinner,
    index: startIndex,
    listSelect: null
  });

  const { listSelect } = createSidebarList(labels, listPlaceholder, (i, _el, opts = {}) => {
    const focusContent = !opts.fromListNav && !opts.fromInitial;
    state.selectDocSync(i, true, true, focusContent);
  });
  state.listSelect = listSelect;
  listSelect(startIndex, { fromInitial: true });
  return state;
}

/**
 * Initializes navigation handlers for the PRD reader, binding UI elements
 * and browser events to the sidebar's document selection logic.
 *
 * @summary This function sets up event listeners for "Next" and "Previous"
 * buttons, keyboard shortcuts, touch gestures, and browser history changes
 * to enable seamless navigation between PRD documents.
 *
 * @pseudocode
 * 1. Query and obtain references to "Next" and "Previous" navigation buttons using `data-nav` attributes.
 * 2. Define `showNext` and `showPrev` callback functions that delegate to `sidebar.selectDocSync` to navigate to the next or previous document, respectively.
 * 3. Call `bindNavigation()` to attach click handlers to the navigation buttons, and keyboard/touch event listeners to the content container, all triggering `showNext` or `showPrev`.
 * 4. Call `bindHistory()` to listen for `popstate` events (browser back/forward actions) and update the sidebar's document selection accordingly.
 *
 * @param {object} sidebar - The sidebar state object, containing methods for document selection and UI elements.
 * @param {string[]} _files - (Ignored) The list of PRD filenames.
 * @returns {void}
 */
export function initNavigationHandlers(sidebar, _files) {
  void _files;
  const nextButtons = document.querySelectorAll('[data-nav="next"]');
  const prevButtons = document.querySelectorAll('[data-nav="prev"]');
  const showNext = () => sidebar.selectDocSync(sidebar.index + 1);
  const showPrev = () => sidebar.selectDocSync(sidebar.index - 1);
  bindNavigation({
    container: sidebar.container,
    nextButtons,
    prevButtons,
    showNext,
    showPrev
  });
  bindHistory((i) => sidebar.selectDocSync(i, false));
}

/**
 * Initializes the Product Requirements Document (PRD) reader page,
 * setting up document loading, sidebar navigation, and content rendering.
 *
 * @summary This asynchronous function orchestrates the entire PRD reader
 * experience, from data fetching to UI interaction.
 *
 * @pseudocode
 * 1. Load all PRD document metadata and content using `loadPrdDocs(docsMap, parserFn)`.
 * 2. Set up the sidebar user interface with the loaded document data using `setupSidebarUI(docData)`. If sidebar setup fails, exit.
 * 3. Initialize navigation handlers (buttons, keyboard, history) using `initNavigationHandlers(sidebar, sidebar.files)`.
 * 4. Replace the current browser history entry with the initial PRD document's state using `replaceHistory(sidebar.baseNames, sidebar.index)`.
 * 5. Show a loading spinner.
 * 6. Ensure the initial document is loaded and parsed: if not already synchronized, fetch it.
 * 7. Render the initial PRD document into the content area using `renderDocument(sidebar, sidebar.index)`.
 * 8. Set focus to the content container for keyboard navigation.
 * 9. Remove the loading spinner.
 * 10. If test mode is not enabled, asynchronously preload all remaining PRD documents in the background to improve subsequent navigation performance.
 *
 * @param {Record<string, string>} [docsMap] - Optional. A map of document filenames to their markdown content, used for testing or pre-loading.
 * @param {Function} [parserFn=markdownToHtml] - Optional. The function used to parse markdown content into HTML. Defaults to `markdownToHtml`.
 * @returns {Promise<void>} A promise that resolves when the PRD reader page is fully set up.
 */
export async function setupPrdReaderPage(docsMap, parserFn = markdownToHtml) {
  const docData = await loadPrdDocs(docsMap, parserFn);
  const sidebar = setupSidebarUI(docData);
  if (!sidebar) return;
  initNavigationHandlers(sidebar, sidebar.files);
  replaceHistory(sidebar.baseNames, sidebar.index);

  sidebar.spinner.show();
  if (!sidebar.ensureDocSync(sidebar.index)) {
    await sidebar.fetchOne(sidebar.index);
  }
  renderDocument(sidebar, sidebar.index);
  sidebar.container.focus({ preventScroll: true });
  sidebar.spinner.remove();

  // Preload remaining docs during idle. Skip when test mode flag is enabled.
  const isTest = getFeatureFlag("enableTestMode");
  if (!isTest) {
    Promise.resolve().then(() => {
      for (let i = 0; i < sidebar.files.length; i++) {
        if (i === sidebar.index) continue;
        sidebar.fetchOne(i);
      }
    });
  }
}

if (!window.SKIP_PRD_AUTO_INIT) {
  onDomReady(() => {
    setupPrdReaderPage();
  });
}
