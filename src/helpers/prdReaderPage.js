import { onDomReady } from "./domReady.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { initTooltips } from "./tooltip.js";
import { SidebarList } from "../components/SidebarList.js";
import { getPrdTaskStats } from "./prdTaskStats.js";
import { getSanitizer } from "./sanitizeHtml.js";
import { createSpinner } from "../components/Spinner.js";

export class SidebarState {
  /**
   * @param {object} opts
   */
  constructor(opts) {
    Object.assign(this, opts);
  }

  /**
   * Select a document by index and optionally update history and focus.
   *
   * @param {number} i
   * @param {boolean} [updateHistory=true]
   * @param {boolean} [skipList=false]
   * @param {boolean} [focusContent=true]
   */
  selectDocSync(i, updateHistory = true, skipList = false, focusContent = true) {
    this.index = ((i % this.files.length) + this.files.length) % this.files.length;
    if (!skipList && this.listSelect) this.listSelect(this.index);
    const hadDoc = this.ensureDocSync(this.index);
    const renderAndFocus = () => {
      renderDocument(this, this.index);
      if (focusContent) this.container.focus();
    };
    if (hadDoc) renderAndFocus();
    else this.fetchOne(this.index).then(renderAndFocus);
    if (updateHistory) {
      const url = new URL(window.location);
      url.searchParams.set("doc", this.baseNames[this.index]);
      history.pushState({ index: this.index }, "", url.pathname + url.search);
    }
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
 * Bind navigation events for PRD browsing.
 *
 * @pseudocode
 * 1. Attach click handlers for next/prev buttons.
 * 2. Handle popstate, keyboard arrows, and swipe gestures.
 * 3. Use provided callbacks to navigate between documents.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.container
 * @param {NodeListOf<HTMLElement>} opts.nextButtons
 * @param {NodeListOf<HTMLElement>} opts.prevButtons
 * @param {Function} opts.showNext
 * @param {Function} opts.showPrev
 * @param {(i:number, updateHistory?:boolean) => void} opts.selectDoc
 */
export function bindNavigation({
  container,
  nextButtons,
  prevButtons,
  showNext,
  showPrev,
  selectDoc
}) {
  nextButtons.forEach((btn) => btn.addEventListener("click", showNext));
  prevButtons.forEach((btn) => btn.addEventListener("click", showPrev));
  window.addEventListener("popstate", (e) => {
    const i = e.state && typeof e.state.index === "number" ? e.state.index : null;
    if (i !== null) selectDoc(i, false);
  });
  document.addEventListener("keydown", (e) => {
    if (document.activeElement !== container) return;
    if (e.key === "ArrowRight") showNext();
    if (e.key === "ArrowLeft") showPrev();
  });
  let startX = 0;
  container.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });
  container.addEventListener("touchend", (e) => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 30) diff < 0 ? showNext() : showPrev();
  });
}

/**
 * Fetch markdown documents and compute stats and titles.
 *
 * @pseudocode
 * 1. For each file, read from `docsMap` or fetch from `dir`.
 * 2. Parse markdown with `parserFn`, sanitize the HTML; on failure, show warning with escaped text.
 * 3. Derive task stats and top-level title.
 * 4. Return arrays of HTML documents, task stats, and titles.
 * Render the document at the provided index.
 *
 * @pseudocode
 * 1. Replace content with sanitized HTML for the document.
 * 2. Update title and task summary.
 * 3. Initialize tooltips and play fade-in animation.
 *
 * @param {SidebarState} state
 * @param {number} index
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
    state.selectDocSync(i, true, true, !opts.fromListNav);
  });
  state.listSelect = listSelect;
  listSelect(startIndex);
  return state;
}

/**
 * Wire up navigation handlers using sidebar state.
 *
 * @pseudocode
 * 1. Resolve navigation buttons.
 * 2. Bind click, popstate, key, and swipe handlers.
 * 3. Delegate to sidebar selection logic.
 *
 * @param {object} sidebar
 * @param {string[]} files
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
    showPrev,
    selectDoc: (i, updateHistory) => sidebar.selectDocSync(i, updateHistory)
  });
}

/**
 * Initialize the Product Requirements Document reader page.
 *
 * @pseudocode
 * 1. Load document metadata with `loadPrdDocs`.
 * 2. Build sidebar UI and bind navigation handlers.
 * 3. Seed history, render the start document, then prefetch remaining docs.
 *
 * @param {Record<string, string>} [docsMap]
 * @param {Function} [parserFn=markdownToHtml]
 */
export async function setupPrdReaderPage(docsMap, parserFn = markdownToHtml) {
  const docData = await loadPrdDocs(docsMap, parserFn);
  const sidebar = setupSidebarUI(docData);
  if (!sidebar) return;
  initNavigationHandlers(sidebar, sidebar.files);
  const url = new URL(window.location);
  url.searchParams.set("doc", sidebar.baseNames[sidebar.index]);
  history.replaceState({ index: sidebar.index }, "", url.toString());

  sidebar.spinner.show();
  if (!sidebar.ensureDocSync(sidebar.index)) {
    await sidebar.fetchOne(sidebar.index);
  }
  renderDocument(sidebar, sidebar.index);
  sidebar.container.focus();
  sidebar.spinner.remove();

  // Preload remaining docs during idle. Skip in test to reduce overhead.
  const isTest =
    typeof process !== "undefined" &&
    process?.env &&
    (process.env.VITEST || process.env.NODE_ENV === "test");
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
