import { onDomReady } from "./domReady.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { initTooltips } from "./tooltip.js";
import { SidebarList } from "../components/SidebarList.js";
import { getPrdTaskStats } from "./prdTaskStats.js";
import { getSanitizer } from "./sanitizeHtml.js";
import { createSpinner } from "../components/Spinner.js";

let sidebarState;
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
 *
 * @param {string[]} files
 * @param {Record<string, string>} [docsMap]
 * @param {Function} parserFn
 * @param {string} dir
 * @returns {Promise<{documents:string[], taskStats:object[], titles:string[]}>}
 */
export async function fetchAndRenderDoc(files, docsMap, parserFn, dir) {
  const DOMPurify = await getSanitizer();
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function parseWithWarning(md) {
    try {
      return DOMPurify.sanitize(parserFn(md));
    } catch {
      const escaped = escapeHtml(md);
      return (
        '<div class="markdown-warning" role="alert" aria-label="Content could not be fully rendered" title="Content could not be fully rendered">⚠️ Partial content</div>' +
        `<pre>${escaped}</pre>`
      );
    }
  }
  const documents = Array(files.length);
  const taskStats = Array(files.length);
  const titles = Array(files.length);
  if (docsMap) {
    for (let i = 0; i < files.length; i++) {
      const name = files[i];
      if (docsMap[name]) {
        const md = docsMap[name];
        documents[i] = parseWithWarning(md);
        taskStats[i] = getPrdTaskStats(md);
        const m = md.match(/^#\s*(.+)/m);
        titles[i] = m ? m[1].trim() : "";
      }
    }
  } else {
    for (let i = 0; i < files.length; i++) {
      const name = files[i];
      try {
        const res = await fetch(`${dir}${name}`);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${name}`);
        const text = await res.text();
        documents[i] = parseWithWarning(text);
        taskStats[i] = getPrdTaskStats(text);
        const m = text.match(/^#\s*(.+)/m);
        titles[i] = m ? m[1].trim() : "";
      } catch (err) {
        console.error(`Failed to load PRD ${name}`, err);
        documents[i] =
          '<div class="warning" role="alert" aria-live="polite">Content unavailable</div>';
        taskStats[i] = { total: 0, completed: 0 };
        titles[i] = "";
      }
    }
  }
  return { documents, taskStats, titles };
}

/**
 * Render the document at the provided index.
 *
 * @pseudocode
 * 1. Replace content with sanitized HTML for the document.
 * 2. Update title and task summary.
 * 3. Initialize tooltips and play fade-in animation.
 *
 * @param {number} index
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
export function renderDocument(index) {
  if (!sidebarState) return;
  const { container, titles, taskStats, titleEl, summaryEl, documents, DOMPurify } = sidebarState;
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
 * Initialize sidebar and document caches.
 *
 * @pseudocode
 * 1. Load filenames and determine starting index.
 * 2. Build sidebar list and prepare document arrays.
 * 3. Return state with helpers for selection and fetching.
 *
 * @param {Record<string,string>} [docsMap]
 * @param {Function} [parserFn]
 * @returns {Promise<object|null>}
 */
export async function initSidebar(docsMap, parserFn = markdownToHtml) {
  const DOMPurify = await getSanitizer();
  const { files, baseNames, labels, dir } = await loadPrdFileList(docsMap);
  const docParam = new URLSearchParams(window.location.search).get("doc");
  const startIndex = Math.max(0, docParam ? baseNames.indexOf(docParam.replace(/\.md$/, "")) : 0);

  const container = document.getElementById("prd-content");
  const listPlaceholder = document.getElementById("prd-list");
  const titleEl = document.getElementById("prd-title");
  const summaryEl = document.getElementById("task-summary");
  if (!container || !listPlaceholder || !files.length) return null;
  const spinner = createSpinner(container.parentElement);

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

  sidebarState = {
    container,
    titleEl,
    summaryEl,
    documents,
    taskStats,
    titles,
    DOMPurify,
    files,
    baseNames,
    dir,
    docsMap,
    parserFn,
    pending,
    listSelect: null,
    selectDocSync: null,
    fetchOne,
    ensureDocSync,
    spinner,
    index: startIndex
  };

  let listSelect;
  function selectDocSync(i, updateHistory = true, skipList = false, focusContent = true) {
    sidebarState.index = ((i % files.length) + files.length) % files.length;
    if (!skipList && sidebarState.listSelect) sidebarState.listSelect(sidebarState.index);
    const hadDoc = ensureDocSync(sidebarState.index);
    if (hadDoc) {
      renderDocument(sidebarState.index);
      if (focusContent) container.focus();
    } else {
      fetchOne(sidebarState.index).then(() => {
        renderDocument(sidebarState.index);
        if (focusContent) container.focus();
      });
    }
    if (updateHistory) {
      const url = new URL(window.location);
      url.searchParams.set("doc", baseNames[sidebarState.index]);
      history.pushState({ index: sidebarState.index }, "", url.pathname + url.search);
    }
  }

  ({ listSelect } = createSidebarList(labels, listPlaceholder, (i, _el, opts = {}) => {
    selectDocSync(i, true, true, !opts.fromListNav);
  }));
  sidebarState.listSelect = listSelect;
  sidebarState.selectDocSync = selectDocSync;
  listSelect(startIndex);

  return sidebarState;
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
 * 1. Initialize sidebar and navigation handlers.
 * 2. Seed history and render the starting document.
 * 3. Prefetch remaining documents in background.
 *
 * @param {Record<string, string>} [docsMap]
 * @param {Function} [parserFn=markdownToHtml]
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
export async function setupPrdReaderPage(docsMap, parserFn = markdownToHtml) {
  const sidebar = await initSidebar(docsMap, parserFn);
  if (!sidebar) return;
  initNavigationHandlers(sidebar, sidebar.files);
  const url = new URL(window.location);
  url.searchParams.set("doc", sidebar.baseNames[sidebar.index]);
  history.replaceState({ index: sidebar.index }, "", url.toString());

  sidebar.spinner.show();
  if (!sidebar.ensureDocSync(sidebar.index)) {
    await sidebar.fetchOne(sidebar.index);
  }
  renderDocument(sidebar.index);
  sidebar.container.focus();
  sidebar.spinner.remove();

  Promise.resolve().then(async () => {
    for (let i = 0; i < sidebar.files.length; i++) {
      if (i === sidebar.index) continue;
      sidebar.fetchOne(i);
    }
  });
}

if (!window.SKIP_PRD_AUTO_INIT) {
  onDomReady(() => {
    setupPrdReaderPage();
  });
}
