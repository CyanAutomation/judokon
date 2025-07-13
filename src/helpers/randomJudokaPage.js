/**
 * Initialize the Random Judoka page once the DOM is ready.
 *
 * @pseudocode
 * 1. Determine if the user prefers reduced motion.
 * 2. Preload judoka and gokyo data using `fetchJson`.
 * 3. Define `displayCard` that calls `generateRandomCard` with the loaded data and
 *    the user's motion preference.
 * 4. Create the "Draw Card!" button and attach the click listener.
 * 5. Execute setup when the DOM content is loaded.
 */
import { fetchJson } from "./dataUtils.js";
import { generateRandomCard } from "./randomCard.js";
import { DATA_DIR } from "./constants.js";
import { createButton } from "../components/Button.js";
import { shouldReduceMotionSync } from "./motionUtils.js";

const DRAW_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="m600-200-56-57 143-143H300q-75 0-127.5-52.5T120-580q0-75 52.5-127.5T300-760h20v80h-20q-42 0-71 29t-29 71q0 42 29 71t71 29h387L544-624l56-56 240 240-240 240Z"/></svg>';

export function setupRandomJudokaPage() {
  const prefersReducedMotion = shouldReduceMotionSync();

  let cachedJudokaData = null;
  let cachedGokyoData = null;

  async function preloadData() {
    try {
      cachedJudokaData = await fetchJson(`${DATA_DIR}judoka.json`);
      cachedGokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);
    } catch (error) {
      console.error("Error preloading data:", error);
    }
  }

  async function displayCard() {
    const cardContainer = document.getElementById("card-container");
    await generateRandomCard(
      cachedJudokaData,
      cachedGokyoData,
      cardContainer,
      prefersReducedMotion
    );
  }

  preloadData().then(displayCard);

  const cardSection = document.querySelector(".card-section");
  const drawButton = createButton("Draw Card!", {
    id: "draw-card-btn",
    className: "draw-card-btn",
    type: "button",
    icon: DRAW_ICON
  });
  drawButton.dataset.testid = "draw-button";
  cardSection.appendChild(drawButton);
  drawButton.addEventListener("click", displayCard);
}

if (document.readyState !== "loading") {
  setupRandomJudokaPage();
} else {
  document.addEventListener("DOMContentLoaded", setupRandomJudokaPage);
}
