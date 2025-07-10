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
    type: "button"
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
