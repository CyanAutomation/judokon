import { fetchJson, validateData } from "./helpers/dataUtils.js";
import { buildCardCarousel, addScrollMarkers } from "./helpers/carouselBuilder.js";
import { generateRandomCard } from "./helpers/randomCard.js";
import { DATA_DIR } from "./helpers/constants.js";
import { shouldReduceMotionSync } from "./helpers/motionUtils.js";

/**
 * Initializes game interactions after the DOM is ready.
 *
 * Queries required DOM elements, wires up control buttons, and loads data for
 * the judoka carousel when requested.
 *
 * @pseudocode
 * 1. Wait for the `DOMContentLoaded` event.
 * 2. Query elements used by the game (buttons, containers).
 * 3. On carousel button click, fetch judoka and gokyo data if needed, validate
 *    it, build the carousel, and reveal it.
 * 4. On hide button click, toggle the card backs in the carousel.
 * 5. On random button click, clear the game area, honor motion preferences, and
 *    call `generateRandomCard`.
 */

document.addEventListener("DOMContentLoaded", () => {
  const showRandom = document.getElementById("showRandom");
  const gameArea = document.getElementById("gameArea");
  const carouselContainer = document.getElementById("carousel-container");
  const showCarouselButton = document.getElementById("showCarousel");
  const hideCard = document.getElementById("hideCard");

  let isCarouselBuilt = false;

  if (!showRandom || !gameArea) {
    console.error("Required DOM elements are missing.");
    return;
  }

  // Event listener for showing the carousel
  if (!showCarouselButton) {
    console.warn("Show carousel button not found. Skipping carousel initialization.");
  } else {
    showCarouselButton.addEventListener("click", async () => {
      if (isCarouselBuilt) {
        carouselContainer.classList.remove("hidden");
        return;
      }

      try {
        const judokaData = await fetchJson(`${DATA_DIR}judoka.json`);
        const gokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);

        validateData(judokaData, "judoka");
        validateData(gokyoData, "gokyo");

        const carousel = await buildCardCarousel(judokaData, gokyoData);
        carouselContainer.appendChild(carousel);
        carouselContainer.classList.remove("hidden");

        requestAnimationFrame(() => {
          const containerEl = carousel.querySelector(".card-carousel");
          if (containerEl) {
            addScrollMarkers(containerEl, carousel);
          }
        });

        isCarouselBuilt = true;
        console.log("Carousel displayed on demand.");
      } catch (error) {
        console.error("Failed to build carousel:", error);
      }
    });
  }

  // Event listener for hiding card backs
  hideCard.addEventListener("click", () => {
    const carouselContainer = document.querySelector(".card-carousel");

    if (!carouselContainer) {
      console.error("Carousel container not found.");
      return;
    }

    const judokaCards = carouselContainer.querySelectorAll(".judoka-card");

    if (judokaCards.length === 0) {
      console.error("No judoka cards found in the carousel to toggle.");
      return;
    }

    judokaCards.forEach((card) => {
      card.classList.toggle("show-card-back");
    });
  });

  // Event listener for showing a random judoka card
  showRandom.addEventListener("click", async () => {
    showRandom.classList.add("hidden");
    gameArea.innerHTML = "";

    const prefersReducedMotion = shouldReduceMotionSync();

    await generateRandomCard(null, null, gameArea, prefersReducedMotion);
  });
});
