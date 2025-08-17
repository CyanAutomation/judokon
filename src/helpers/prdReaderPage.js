import { onDomReady } from "./domReady.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { initTooltips } from "./tooltip.js";
import { SidebarList } from "../components/SidebarList.js";
import { getPrdTaskStats } from "./prdTaskStats.js";
import { getSanitizer } from "./sanitizeHtml.js";

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
 */
export function bindNavigation({ container, nextButtons, prevButtons, showNext, showPrev }) {
  nextButtons.forEach((btn) => btn.addEventListener("click", showNext));
  prevButtons.forEach((btn) => btn.addEventListener("click", showPrev));
  window.addEventListener("popstate", (e) => {
    const i = e.state && typeof e.state.index === "number" ? e.state.index : null;
    if (i !== null) selectDocSync(i, false);
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
 * Initialize the Product Requirements Document reader page.
 *
 * @pseudocode
 * 1. Load filenames and sidebar labels.
 * 2. Determine starting document from URL.
 * 3. Create sidebar immediately so keyboard traversal works early.
 * 4. Fetch and render only the starting doc first, sanitizing the HTML; focus content and seed history.
 * 5. Lazy-load remaining docs in the background and fetch-on-demand when selected.
 * 6. Bind navigation (buttons, history, keys, swipe).
 *
 * @param {Record<string, string>} [docsMap]
 * @param {Function} [parserFn=markdownToHtml]
 */
export async function setupPrdReaderPage(docsMap, parserFn = markdownToHtml) {
  const DOMPurify = await getSanitizer();
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

  // Prepare arrays for lazy population and a small cache of in-flight fetches.
  const documents = Array(files.length);
  const taskStats = Array(files.length);
  const titles = Array(files.length);
  const pending = Array(files.length);

  // Helper: fetch a single doc and fill arrays.
  const fetchOne = async (i) => {
    if (documents[i]) return;
    if (pending[i]) return pending[i];
    pending[i] = (async () => {
      // Reuse internal helpers from fetchAndRenderDoc scope
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

  let index = startIndex;

  // Create sidebar immediately so keyboard traversal is available early.
  const { listSelect } = createSidebarList(labels, listPlaceholder, (i, _el, opts = {}) => {
    // Use sync-first selection on list interactions for immediate updates.
    selectDocSync(i, true, true, !opts.fromListNav);
  });

  let cleanupTooltips = () => {};
  // Ensure the initially visible document is reflected in the sidebar
  // selection and accessibility state before any navigation.
  // This keeps aria-current/selected in sync with the rendered content.
  listSelect(startIndex);
  function renderDoc(i) {
    cleanupTooltips();
    container.innerHTML = DOMPurify.sanitize(documents[i] || "");
    container.classList.remove("fade-in");
    void container.offsetWidth;
    container.classList.add("fade-in");
    if (titleEl) titleEl.textContent = titles[i] || "";
    if (summaryEl) {
      const { total, completed } = taskStats[i] || { total: 0, completed: 0 };
      const percent = total ? Math.round((completed / total) * 100) : 0;
      summaryEl.textContent = `Tasks: ${completed}/${total} (${percent}%)`;
    }
    initTooltips(container).then((fn) => {
      cleanupTooltips = fn;
    });
  }

  // Attempt to fill a document synchronously when possible (docsMap or cached).
  function ensureDocSync(i) {
    if (documents[i]) return true;
    const name = files[i];
    if (docsMap && docsMap[name]) {
      const md = docsMap[name];
      const escapeHtml = (str) =>
        str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const parseWithWarning = (mdText) => {
        try {
          return DOMPurify.sanitize(parserFn(mdText));
        } catch {
          const escaped = escapeHtml(mdText);
          return (
            '<div class="markdown-warning" role="alert" aria-label="Content could not be fully rendered" title="Content could not be fully rendered">⚠️ Partial content</div>' +
            `<pre>${escaped}</pre>`
          );
        }
      };
      documents[i] = parseWithWarning(md);
      taskStats[i] = getPrdTaskStats(md);
      const m = md.match(/^#\s*(.+)/m);
      titles[i] = m ? m[1].trim() : "";
      return true;
    }
    return false;
  }

  // Synchronous-first selector for immediate UI updates during user input.
  function selectDocSync(i, updateHistory = true, skipList = false, focusContent = true) {
    index = ((i % files.length) + files.length) % files.length;
    if (!skipList) listSelect(index);
    const hadDoc = ensureDocSync(index);
    if (hadDoc) {
      renderDoc(index);
      if (focusContent) container.focus();
    } else {
      // Kick off async fetch and update when ready without blocking the click handler.
      fetchOne(index).then(() => {
        renderDoc(index);
        if (focusContent) container.focus();
      });
    }
    if (updateHistory) {
      const url = new URL(window.location);
      url.searchParams.set("doc", baseNames[index]);
      history.pushState({ index }, "", url.pathname + url.search);
    }
  }

  const showNext = () => selectDocSync(index + 1);
  const showPrev = () => selectDocSync(index - 1);

  bindNavigation({
    container,
    nextButtons,
    prevButtons,
    showNext,
    showPrev
  });

  // Seed initial history and render the starting doc as soon as it is fetched.
  const url = new URL(window.location);
  url.searchParams.set("doc", baseNames[startIndex]);
  history.replaceState({ index: startIndex }, "", url.toString());

  if (spinner) spinner.style.display = "block";
  // Load the initial doc synchronously if possible for snappy first paint.
  if (!ensureDocSync(startIndex)) {
    await fetchOne(startIndex);
  }
  renderDoc(startIndex);
  container.focus();
  if (spinner) spinner.style.display = "none";

  // Opportunistically fetch remaining docs in the background to speed up later navigation.
  // Avoid blocking UI; fire-and-forget.
  Promise.resolve().then(async () => {
    for (let i = 0; i < files.length; i++) {
      if (i === startIndex) continue;
      // Intentionally do not await to keep UI responsive.
      fetchOne(i);
    }
  });
}

if (!window.SKIP_PRD_AUTO_INIT) {
  onDomReady(() => {
    setupPrdReaderPage();
  });
}
