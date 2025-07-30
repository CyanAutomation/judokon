import { onDomReady } from "./domReady.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { initTooltips } from "./tooltip.js";

/**
 * Initialize the Product Requirements Document reader page.
 *
 * @pseudocode
 * 1. Load all markdown files from the PRD directory using `import.meta.glob`.
 * 2. Convert each file to HTML with `parserFn` (defaults to `markdownToHtml`).
 * 3. Build sidebar list items for each document and select the first one.
 * 4. Implement `select(index)` to render the HTML and highlight the item.
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

  const documents = [];
  if (docsMap) {
    for (const name of FILES) {
      if (docsMap[name]) documents.push(parserFn(docsMap[name]));
    }
  } else {
    for (const name of FILES) {
      const res = await fetch(`${PRD_DIR}${name}`);
      const text = await res.text();
      documents.push(parserFn(text));
    }
  }
  const container = document.getElementById("prd-content");
  const listContainer = document.getElementById("prd-list");
  const nextButtons = document.querySelectorAll('[data-nav="next"]');
  const prevButtons = document.querySelectorAll('[data-nav="prev"]');

  if (!container || !listContainer || documents.length === 0) return;

  FILES.forEach((file, i) => {
    const li = document.createElement("li");
    li.tabIndex = 0;
    li.textContent = file
      .replace(/^prd/, "")
      .replace(/\.md$/, "")
      .replace(/([A-Z])/g, " $1")
      .trim();
    li.addEventListener("click", () => select(i));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(i);
      }
    });
    listContainer.appendChild(li);
  });

  let index = 0;

  function select(i) {
    index = (i + documents.length) % documents.length;
    container.innerHTML = documents[index];
    Array.from(listContainer.children).forEach((li, idx) => {
      li.classList.toggle("selected", idx === index);
    });
    container.classList.remove("fade-in");
    void container.offsetWidth;
    container.classList.add("fade-in");
    initTooltips();
  }

  function showNext() {
    select(index + 1);
  }

  function showPrev() {
    select(index - 1);
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

  select(0);
}

if (!window.SKIP_PRD_AUTO_INIT) {
  onDomReady(() => {
    setupPrdReaderPage();
  });
}
