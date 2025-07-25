import { setupButtonEffects } from "./buttonEffects.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";

/**
 * Initialize the mockup image carousel.
 *
 * @pseudocode
 * 1. Select the image, filename display, and navigation buttons.
 * 2. Define an array of mockup filenames and compute their base URL.
 * 3. Implement `showImage(index)` to update the image source, alt text, and filename.
 * 4. Attach click handlers to cycle forward or backward with wraparound.
 * 5. Support arrow key navigation for accessibility.
 * 6. Show the first image and apply button ripple effects.
 */
export function setupMockupViewerPage() {
  const imgEl = document.getElementById("mockup-image");
  const filenameEl = document.getElementById("mockup-filename");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");

  if (!imgEl || !filenameEl || !prevBtn || !nextBtn) {
    return;
  }

  const basePath = new URL("../../design/mockups/", import.meta.url).href;

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

  function showImage(index) {
    currentIndex = (index + files.length) % files.length;
    const file = files[currentIndex];
    imgEl.src = `${basePath}${file}`;
    imgEl.alt = file;
    filenameEl.textContent = file;
    imgEl.classList.add("fade");
    imgEl.style.display = "block";
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

onDomReady(setupMockupViewerPage);
