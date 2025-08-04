import { setupButtonEffects } from "./buttonEffects.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { createSidebarList } from "../components/SidebarList.js";

/**
 * Initialize the mockup image carousel.
 *
 * @pseudocode
 * 1. Select the image, filename display, sidebar list, and navigation buttons.
 * 2. Define an array of mockup filenames and set a base path.
 * 3. Build sidebar list items that call `showImage(index)` when activated.
 * 4. Implement `showImage(index)` to update the image, alt text, filename, and sidebar highlight.
 * 5. Attach click handlers and keyboard events to cycle images with wraparound.
 * 6. Show the first image and apply button ripple effects.
 *
 * @returns {void}
 */
export function setupMockupViewerPage() {
  const imgEl = document.getElementById("mockup-image");
  const filenameEl = document.getElementById("mockup-filename");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const listPlaceholder = document.getElementById("mockup-list");

  if (!imgEl || !filenameEl || !prevBtn || !nextBtn || !listPlaceholder) {
    return;
  }

  const basePath = new URL("/design/mockups/", document.baseURI).href;

  const files = [
    "mockupBattleInfoBar1.png",
    "mockupBattleInfoBar2.png",
    "mockupBattleScreen1.jpg",
    "mockupBattleScreen2.png",
    "mockupBottomNavigation2.png",
    "mockupButtonTypes1.jpeg",
    "mockupCardCarousel1.png",
    "mockupCardCarousel2.png",
    "mockupCardCarousel3.png",
    "mockupCardCode1.png",
    "mockupCardCode2.png",
    "mockupCountryPicker1.png",
    "mockupCountryPicker2.png",
    "mockupDrawCard1.png",
    "mockupDrawCard2.png",
    "mockupGameModes1.png",
    "mockupGameModes2.png",
    "mockupGameModes3.png",
    "mockupGameModes4.png",
    "mockupGameSettings1.png",
    "mockupGameSettings2.png",
    "mockupGameSettings3.png",
    "mockupMapNavigation1.png",
    "mockupMapNavigation2.png",
    "mockupMapNavigation3.png",
    "mockupNavigationMap1.png",
    "mockupNavigationMap2.png",
    "mockupNavigationMap3.png",
    "mockupQuoteScreen.png",
    "mockupQuoteScreen1.png",
    "mockupQuoteScreen2.png",
    "mockupQuoteScreen3.png",
    "mockupQuoteScreen4.png",
    "mockupUpdateJudoka1.png"
  ];

  let currentIndex = 0;
  const { element: listEl, select: listSelect } = createSidebarList(files, (i) => {
    if (i !== currentIndex) showImage(i);
  });
  listEl.id = "mockup-list";
  listPlaceholder.replaceWith(listEl);

  function showImage(index) {
    currentIndex = (index + files.length) % files.length;
    const file = files[currentIndex];
    imgEl.src = `${basePath}${file}`;
    imgEl.alt = file;
    filenameEl.textContent = file;
    imgEl.classList.add("fade");
    imgEl.style.display = "block";
    listSelect(currentIndex);
  }

  prevBtn.addEventListener("click", () => showImage(currentIndex - 1));
  nextBtn.addEventListener("click", () => showImage(currentIndex + 1));

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") showImage(currentIndex - 1);
    if (e.key === "ArrowRight") showImage(currentIndex + 1);
  });

  showImage(0);
  setupButtonEffects();
  initTooltips();
}

if (!window.SKIP_MOCKUP_AUTO_INIT) {
  onDomReady(setupMockupViewerPage);
}
