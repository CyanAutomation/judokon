import { onDomReady } from "./domReady.js";
import { markdownToHtml } from "./markdownToHtml.js";
import { initTooltips } from "./tooltip.js";

/**
 * Initialize the Product Requirements Document reader page.
 *
 * @pseudocode
 * 1. Load all markdown files from the PRD directory using `import.meta.glob`.
 * 2. Convert each file to HTML with `parserFn` (defaults to `markdownToHtml`).
 * 3. Display the first document inside the content container.
 * 4. Provide next/previous navigation with wrap-around.
 *    - Attach click handlers to all navigation buttons.
 * 5. Support arrow key and swipe gestures for navigation.
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
  const nextButtons = document.querySelectorAll('[data-nav="next"]');
  const prevButtons = document.querySelectorAll('[data-nav="prev"]');

  if (!container || documents.length === 0) return;

  let index = 0;

  function render() {
    container.innerHTML = documents[index];
  }

  function showNext() {
    index = (index + 1) % documents.length;
    render();
  }

  function showPrev() {
    index = (index - 1 + documents.length) % documents.length;
    render();
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

  render();
  initTooltips();
}

if (!window.SKIP_PRD_AUTO_INIT) {
  onDomReady(() => {
    setupPrdReaderPage();
  });
}
