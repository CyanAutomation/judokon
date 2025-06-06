import { fetchDataWithErrorHandling, validateData } from "./helpers/dataUtils.js";
import { buildCardCarousel } from "./helpers/carouselBuilder.js";
import { displayJudokaCard, getRandomJudoka } from "./helpers/cardUtils.js";

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
        const judokaData = await fetchDataWithErrorHandling("./data/judoka.json");
        const gokyoData = await fetchDataWithErrorHandling("./data/gokyo.json");

        validateData(judokaData, "judoka");
        validateData(gokyoData, "gokyo");

        const carousel = await buildCardCarousel(judokaData, gokyoData);
        carouselContainer.appendChild(carousel);
        carouselContainer.classList.remove("hidden");

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

    try {
      const judokaData = await fetchDataWithErrorHandling("./data/judoka.json");
      const gokyoData = await fetchDataWithErrorHandling("./data/gokyo.json");

      validateData(judokaData, "judoka");
      validateData(gokyoData, "gokyo");

      const selectedJudoka = getRandomJudoka(judokaData);
      displayJudokaCard(selectedJudoka, gokyoData, gameArea, showRandom);
    } catch (error) {
      console.error("Error loading card:", error);
      gameArea.innerHTML = `<p>⚠️ Failed to load card. ${error.message}. Please try again later.</p>`;
    }
  });
});
