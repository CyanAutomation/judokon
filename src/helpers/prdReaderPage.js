import { onDomReady } from "./domReady.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { initTooltips } from "./tooltip.js";
import { createSidebarList } from "../components/SidebarList.js";
import { getPrdTaskStats } from "./prdTaskStats.js";

/**
 * Initialize the Product Requirements Document reader page.
 *
 * @pseudocode
 * 1. Load all markdown files from the PRD directory using `import.meta.glob`.
 *    Sort the filenames alphabetically so sidebar and document order match.
 * 2. Convert each file to HTML with `parserFn` (defaults to `markdownToHtml`).
 * 3. Build sidebar list items using `createSidebarList` and select the first document.
 * 4. Implement `selectDoc(index)` to render the HTML and highlight the item.
 * 5. Provide next/previous navigation with wrap-around.
 *    - Attach click handlers to all navigation buttons.
 * 6. Support arrow key and swipe gestures for navigation.
 *
 * @param {Record<string, string>} [docsMap] Optional preloaded docs for testing.
 * @param {Function} [parserFn=markdownToHtml] Parser used to convert Markdown to HTML.
 */
export async function setupPrdReaderPage(docsMap, parserFn = markdownToHtml) {
  const PRD_DIR = new URL("../../design/productRequirementsDocuments/", import.meta.url).href;

  const FILES = docsMap
    ? Object.keys(docsMap)
    : [
        "prdBattleInfoBar.md",
        "prdBrowseJudoka.md",
        "prdCardCarousel.md",
        "prdCardCodeGeneration.md",
        "prdClassicBattle.md",
        "prdCountryPickerFilter.md",
        "prdDrawRandomCard.md",
        "prdGameModes.md",
        "prdHomePageNavigation.md",
        "prdJudokaCard.md",
        "prdMeditationScreen.md",
        "prdNavigationBar.md",
        "prdNavigationMap.md",
        "prdPseudoJapanese.md",
        "prdRandomJudoka.md",
        "prdSettingsMenu.md",
        "prdTeamBattleFemale.md",
        "prdTeamBattleMale.md",
        "prdTeamBattleMixed.md",
        "prdTeamBattleRules.md",
        "prdTeamBattleSelection.md",
        "prdUpdateJudoka.md",
        "prdChangeLog.md"
      ];

  FILES.sort((a, b) => a.localeCompare(b));

  const documents = [];
  const taskStats = [];
  const titles = [];
  if (docsMap) {
    for (const name of FILES) {
      if (docsMap[name]) {
        const md = docsMap[name];
        documents.push(parserFn(md));
        taskStats.push(getPrdTaskStats(md));
        const titleMatch = md.match(/^#\s*(.+)/m);
        titles.push(titleMatch ? titleMatch[1].trim() : "");
      }
    }
  } else {
    for (const name of FILES) {
      const res = await fetch(`${PRD_DIR}${name}`);
      const text = await res.text();
      documents.push(parserFn(text));
      taskStats.push(getPrdTaskStats(text));
      const titleMatch = text.match(/^#\s*(.+)/m);
      titles.push(titleMatch ? titleMatch[1].trim() : "");
    }
  }
  const container = document.getElementById("prd-content");
  const listPlaceholder = document.getElementById("prd-list");
  const nextButtons = document.querySelectorAll('[data-nav="next"]');
  const prevButtons = document.querySelectorAll('[data-nav="prev"]');
  const titleEl = document.getElementById("prd-title");
  const summaryEl = document.getElementById("task-summary");

  if (!container || !listPlaceholder || documents.length === 0) return;

  const labels = FILES.map((file) =>
    file
      .replace(/^prd/, "")
      .replace(/\.md$/, "")
      .replace(/([A-Z])/g, " $1")
      .trim()
  );

  let index = 0;
  const { element: listEl, select: listSelect } = createSidebarList(labels, (i) => {
    index = i;
    renderDoc(index);
  });
  listEl.id = "prd-list";
  listPlaceholder.replaceWith(listEl);

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

  function selectDoc(i) {
    index = (i + documents.length) % documents.length;
    listSelect(index);
    renderDoc(index);
  }

  function showNext() {
    selectDoc(index + 1);
  }

  function showPrev() {
    selectDoc(index - 1);
  }

  nextButtons.forEach((btn) => btn.addEventListener("click", showNext));
  prevButtons.forEach((btn) => btn.addEventListener("click", showPrev));

  document.addEventListener("keydown", (e) => {
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

  selectDoc(0);
}

if (!window.SKIP_PRD_AUTO_INIT) {
  onDomReady(() => {
    setupPrdReaderPage();
  });
}
