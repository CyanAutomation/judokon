import { onDomReady } from "./domReady.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { initTooltips } from "./tooltip.js";
import { SidebarList } from "../components/SidebarList.js";
import { getPrdTaskStats } from "./prdTaskStats.js";

/**
 * Initialize the Product Requirements Document reader page.
 *
 * @pseudocode
 * 1. Build the list of PRD filenames.
 *    - Use `import.meta.glob` when available.
 *    - Otherwise, fetch `prdIndex.json` for the filenames.
 *    - Sort filenames alphabetically so sidebar and document order match.
 * 2. Create sidebar items and helper functions.
 * 3. Show a loading spinner and fetch each markdown file, parsing to HTML with `parserFn`.
 * 4. Hide the spinner after rendering the first document or on fetch error.
 * 5. Provide next/previous navigation with wrap-around and support arrow key (when content is focused) and swipe gestures.
 * 6. Read the `doc` query parameter and update history so URLs deep‑link to PRDs.
 *
 * @param {Record<string, string>} [docsMap] Optional preloaded docs for testing.
 * @param {Function} [parserFn=markdownToHtml] Parser used to convert Markdown to HTML.
 */
export async function setupPrdReaderPage(docsMap, parserFn = markdownToHtml) {
  const base = (import.meta?.env?.BASE_URL ?? "/").replace(/\/?$/, "/");
  const PRD_DIR = `${base}design/productRequirementsDocuments/`;

  let FILES = [];
  if (docsMap) {
    FILES = Object.keys(docsMap);
  } else if (typeof import.meta.glob === "function") {
    FILES = Object.keys(import.meta.glob("../../design/productRequirementsDocuments/*.md")).map(
      (p) => p.split("/").pop()
    );
  } else {
    try {
      const res = await fetch(`${PRD_DIR}prdIndex.json`);
      FILES = (await res.json()) || [];
    } catch {
      FILES = [];
    }
  }

  FILES.sort((a, b) => a.localeCompare(b));
  const baseNames = FILES.map((f) => f.replace(/\.md$/, ""));

  const params = new URLSearchParams(window.location.search);
  const docParam = params.get("doc");
  let startIndex = docParam ? baseNames.indexOf(docParam.replace(/\.md$/, "")) : 0;
  if (startIndex === -1) startIndex = 0;

  const container = document.getElementById("prd-content");
  const listPlaceholder = document.getElementById("prd-list");
  const nextButtons = document.querySelectorAll('[data-nav="next"]');
  const prevButtons = document.querySelectorAll('[data-nav="prev"]');
  const titleEl = document.getElementById("prd-title");
  const summaryEl = document.getElementById("task-summary");
  const spinner = document.getElementById("prd-spinner");

  if (!container || !listPlaceholder || FILES.length === 0) return;
  if (spinner) spinner.style.display = "block";
  const documents = Array(FILES.length);
  const taskStats = Array(FILES.length);
  const titles = Array(FILES.length);

  const labels = FILES.map((file) =>
    file
      .replace(/^prd/, "")
      .replace(/\.md$/, "")
      .replace(/([A-Z])/g, " $1")
      .trim()
  );

  let index = startIndex;
  const list = new SidebarList(labels, (i, _el, opts = {}) => {
    selectDoc(i, true, true, !opts.fromListNav);
  });
  const listEl = list.element;
  const listSelect = list.select.bind(list);
  listEl.id = "prd-list";
  listPlaceholder.replaceWith(listEl);

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

  function updateHeader(i) {
    if (titleEl) titleEl.textContent = titles[i] || "";
    if (summaryEl) {
      const { total, completed } = taskStats[i] || { total: 0, completed: 0 };
      const percent = total ? Math.round((completed / total) * 100) : 0;
      summaryEl.textContent = `Tasks: ${completed}/${total} (${percent}%)`;
    }
  }

  function renderDoc(i) {
    container.innerHTML = documents[i];
    container.classList.remove("fade-in");
    void container.offsetWidth;
    container.classList.add("fade-in");
    updateHeader(i);
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

  function showNext() {
    selectDoc(index + 1);
  }

  function showPrev() {
    selectDoc(index - 1);
  }

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
    if (Math.abs(diff) > 30) {
      diff < 0 ? showNext() : showPrev();
    }
  });

  if (docsMap) {
    for (let i = 0; i < FILES.length; i++) {
      const name = FILES[i];
      if (docsMap[name]) {
        const md = docsMap[name];
        documents[i] = parseWithWarning(md);
        taskStats[i] = getPrdTaskStats(md);
        const titleMatch = md.match(/^#\s*(.+)/m);
        titles[i] = titleMatch ? titleMatch[1].trim() : "";
      }
    }
  } else {
    for (let i = 0; i < FILES.length; i++) {
      const name = FILES[i];
      try {
        const res = await fetch(`${PRD_DIR}${name}`);
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${name}`);
        const text = await res.text();
        documents[i] = parseWithWarning(text);
        taskStats[i] = getPrdTaskStats(text);
        const titleMatch = text.match(/^#\s*(.+)/m);
        titles[i] = titleMatch ? titleMatch[1].trim() : "";
      } catch (err) {
        console.error(`Failed to load PRD ${name}`, err);
        documents[i] =
          '<div class="warning" role="alert" aria-live="polite">Content unavailable</div>';
        taskStats[i] = { total: 0, completed: 0 };
        titles[i] = "";
      }
    }
  }

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
