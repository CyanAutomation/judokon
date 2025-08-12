import { onDomReady } from "./domReady.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { initTooltips } from "./tooltip.js";
import { SidebarList } from "../components/SidebarList.js";
import { getPrdTaskStats } from "./prdTaskStats.js";

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
 * @param {(i:number, updateHistory?:boolean)=>void} opts.selectDoc
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
 * 2. Parse markdown with `parserFn`; on failure, show warning with escaped text.
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
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function parseWithWarning(md) {
    try {
      return parserFn(md);
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
 * Initialize the Product Requirements Document reader page.
 *
 * @pseudocode
 * 1. Load filenames and sidebar labels.
 * 2. Determine starting document from URL.
 * 3. Create sidebar, fetch docs, and render selected doc.
 * 4. Bind navigation (buttons, history, keys, swipe).
 *
 * @param {Record<string, string>} [docsMap]
 * @param {Function} [parserFn=markdownToHtml]
 */
export async function setupPrdReaderPage(docsMap, parserFn = markdownToHtml) {
  const { files, baseNames, labels, dir } = await loadPrdFileList(docsMap);
  const docParam = new URLSearchParams(window.location.search).get("doc");
  let startIndex = Math.max(0, docParam ? baseNames.indexOf(docParam.replace(/\.md$/, "")) : 0);
  const container = document.getElementById("prd-content");
  const listPlaceholder = document.getElementById("prd-list");
  const nextButtons = document.querySelectorAll('[data-nav="next"]');
  const prevButtons = document.querySelectorAll('[data-nav="prev"]');
  const titleEl = document.getElementById("prd-title");
  const summaryEl = document.getElementById("task-summary");
  const spinner = document.getElementById("prd-spinner");
  if (!container || !listPlaceholder || !files.length) return;
  if (spinner) spinner.style.display = "block";
  const { documents, taskStats, titles } = await fetchAndRenderDoc(files, docsMap, parserFn, dir);
  let index = startIndex;
  const { listSelect } = createSidebarList(labels, listPlaceholder, (i, _el, opts = {}) =>
    selectDoc(i, true, true, !opts.fromListNav)
  );
  function renderDoc(i) {
    container.innerHTML = documents[i];
    container.classList.remove("fade-in");
    void container.offsetWidth;
    container.classList.add("fade-in");
    if (titleEl) titleEl.textContent = titles[i] || "";
    if (summaryEl) {
      const { total, completed } = taskStats[i] || { total: 0, completed: 0 };
      const percent = total ? Math.round((completed / total) * 100) : 0;
      summaryEl.textContent = `Tasks: ${completed}/${total} (${percent}%)`;
    }
    initTooltips();
  }
  function selectDoc(i, updateHistory = true, skipList = false, focusContent = true) {
    index = (i + documents.length) % documents.length;
    if (!skipList) listSelect(index);
    renderDoc(index);
    if (focusContent) container.focus();
    if (updateHistory) {
      const url = new URL(window.location);
      url.searchParams.set("doc", baseNames[index]);
      history.pushState({ index }, "", url.pathname + url.search);
    }
  }
  const showNext = () => selectDoc(index + 1);
  const showPrev = () => selectDoc(index - 1);
  bindNavigation({
    container,
    nextButtons,
    prevButtons,
    showNext,
    showPrev,
    selectDoc
  });
  const url = new URL(window.location);
  url.searchParams.set("doc", baseNames[startIndex]);
  history.replaceState({ index: startIndex }, "", url.toString());
  selectDoc(startIndex, false);
  if (spinner) spinner.style.display = "none";
}

if (!window.SKIP_PRD_AUTO_INIT) {
  onDomReady(() => {
    setupPrdReaderPage();
  });
}
