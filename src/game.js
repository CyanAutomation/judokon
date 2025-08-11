import { fetchJson, validateData } from "./helpers/dataUtils.js";
import { buildCardCarousel, initScrollMarkers } from "./helpers/carouselBuilder.js";
import { generateRandomCard } from "./helpers/randomCard.js";
import { DATA_DIR } from "./helpers/constants.js";
import { shouldReduceMotionSync } from "./helpers/motionUtils.js";
import { initTooltips } from "./helpers/tooltip.js";
import { toggleInspectorPanels } from "./helpers/cardUtils.js";
import { initFeatureFlags, isEnabled, featureFlagsEmitter } from "./helpers/featureFlags.js";
import { debugLog } from "./helpers/debug.js";

let inspectorEnabled = false;

/**
 * Wire up the carousel toggle button.
 *
 * @pseudocode
 * 1. Exit early if `button` is not provided.
 * 2. Maintain an `isBuilt` flag inside the closure.
 * 3. On click:
 *    a. If the carousel is built, simply reveal `container`.
 *    b. If `container` is missing, log an error.
 *    c. Otherwise fetch and validate judoka and gokyo data.
 *    d. Build the carousel, append it to `container`, and initialize scroll markers.
 *    e. Reveal `container` and mark the carousel as built.
 *    f. Log any errors that occur.
 *
 * @param {HTMLElement} button - Button to show the carousel.
 * @param {HTMLElement} container - Container for the carousel.
 */
export function setupCarouselToggle(button, container) {
  let isBuilt = false;
  if (!button) {
    console.warn("Show carousel button not found. Skipping carousel initialization.");
    return;
  }

  button.addEventListener("click", async () => {
    if (isBuilt) {
      container?.classList.remove("hidden");
      return;
    }

    if (!container) {
      console.error("Carousel container not found.");
      return;
    }

    try {
      const judokaData = await fetchJson(`${DATA_DIR}judoka.json`);
      const gokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);

      validateData(judokaData, "judoka");
      validateData(gokyoData, "gokyo");

      const carousel = await buildCardCarousel(judokaData, gokyoData);
      container.appendChild(carousel);
      container.classList.remove("hidden");

      const containerEl = carousel.querySelector(".card-carousel");
      if (containerEl) {
        initScrollMarkers(containerEl, carousel);
      }

      isBuilt = true;
      debugLog("Carousel displayed on demand.");
    } catch (error) {
      console.error("Failed to build carousel:", error);
    }
  });
}

/**
 * Toggle card backs in the carousel.
 *
 * @pseudocode
 * 1. Exit early if `button` is missing.
 * 2. On click:
 *    a. Locate `.card-carousel` in the document.
 *    b. Query all `.judoka-card` elements and toggle `show-card-back` on each.
 *    c. Log errors when elements are missing.
 *
 * @param {HTMLElement} button - Button that hides card faces.
 */
export function setupHideCardButton(button) {
  if (!button) return;
  button.addEventListener("click", () => {
    const container = document.querySelector(".card-carousel");

    if (!container) {
      console.error("Carousel container not found.");
      return;
    }

    const cards = container.querySelectorAll(".judoka-card");
    if (cards.length === 0) {
      console.error("No judoka cards found in the carousel to toggle.");
      return;
    }

    cards.forEach((card) => {
      card.classList.toggle("show-card-back");
    });
  });
}

/**
 * Display a random judoka card.
 *
 * @pseudocode
 * 1. Exit early if `button` or `container` is missing.
 * 2. On click:
 *    a. Hide `button` and clear `container`.
 *    b. Determine motion preference with `shouldReduceMotionSync`.
 *    c. Call `generateRandomCard` using the preference.
 *
 * @param {HTMLElement} button - Button to trigger card generation.
 * @param {HTMLElement} container - Element to display the card.
 */
export function setupRandomCardButton(button, container) {
  if (!button || !container) return;
  button.addEventListener("click", async () => {
    button.classList.add("hidden");
    container.innerHTML = "";

    const prefersReducedMotion = shouldReduceMotionSync();
    await generateRandomCard(null, null, container, prefersReducedMotion, undefined, {
      enableInspector: inspectorEnabled
    });
  });
}

/**
 * Initializes game interactions after the DOM is ready.
 *
 * Queries required DOM elements, wires up control buttons, and loads data for
 * the judoka carousel when requested.
 *
 * @pseudocode
 * 1. Wait for the `DOMContentLoaded` event.
 * 2. Query elements used by the game (buttons, containers).
 * 3. Call `setupCarouselToggle` with the carousel button and container.
 * 4. Call `setupHideCardButton` with the hide-card button.
 * 5. Call `setupRandomCardButton` with the random button and game area.
 * 6. Call `initTooltips` to initialize tooltips.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const showRandom = document.getElementById("showRandom");
  const gameArea = document.getElementById("gameArea");
  const carouselContainer = document.getElementById("carousel-container");
  const showCarouselButton = document.getElementById("showCarousel");
  const hideCard = document.getElementById("hideCard");

  if (!showRandom || !gameArea) {
    console.error("Required DOM elements are missing.");
    return;
  }

  try {
    await initFeatureFlags();
    inspectorEnabled = isEnabled("enableCardInspector");
  } catch {
    inspectorEnabled = false;
  }
  toggleInspectorPanels(inspectorEnabled);

  featureFlagsEmitter.addEventListener("change", () => {
    inspectorEnabled = isEnabled("enableCardInspector");
    toggleInspectorPanels(inspectorEnabled);
  });

  setupCarouselToggle(showCarouselButton, carouselContainer);
  setupHideCardButton(hideCard);
  setupRandomCardButton(showRandom, gameArea);
  initTooltips();
});
