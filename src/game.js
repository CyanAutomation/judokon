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
 * Wire up the carousel toggle button and lazily build the carousel on demand.
 *
 * @summary Attach a click handler to `button` that builds and reveals a judoka carousel
 * if it hasn't been built yet. Validates fetched data before building.
 * @pseudocode
 * 1. Exit early if `button` is not provided.
 * 2. Maintain an `isBuilt` flag inside the closure to track if the carousel has been built.
 * 3. Define an asynchronous `handleClick` function for the button's click event:
 *    a. If `isBuilt` is true, simply remove the "hidden" class from `container` and return.
 *    b. If `container` is missing, log an error to the console and return.
 *    c. If a build is in progress (`buildPromise`), await that promise, reveal `container`, and return.
 *    d. Otherwise, attempt to fetch `judoka.json` and `gokyo.json` data.
 *    e. Initialize an empty array `validJudoka`.
 *    f. If `judokaData` is an array, iterate through each `judoka` entry:
 *       i. Attempt to validate the `judoka` entry using `validateData`.
 *       ii. If validation succeeds, push the `judoka` to `validJudoka`.
 *       iii. If validation fails, catch the error and log a message indicating the invalid entry was skipped.
 *    g. If `judokaData` is not an array, log an error.
 *    h. Validate `gokyoData` using `validateData`.
 *    i. Build the carousel using `buildCardCarousel` with the `validJudoka` and `gokyoData`.
 *    j. Append the created `carousel` to the `container`.
 *    k. Remove the "hidden" class from `container` to reveal it.
 *    l. If a `.card-carousel` element is found within the `carousel`, initialize scroll markers using `initScrollMarkers`.
 *    m. Set `isBuilt` to `true`.
 *    n. Log a debug message indicating the carousel was displayed on demand.
 *    o. Catch any errors that occur during the fetch, validation, or carousel building process and log them.
 * 4. Add the `handleClick` function as an event listener for the "click" event on the `button`.
 * 5. Return the `handleClick` function for optional manual invocation.
 *
 * @param {HTMLElement} button - Button to show the carousel.
 * @param {HTMLElement} container - Container for the carousel.
 * @returns {(Function|undefined)} The click handler or undefined when initialization is skipped.
 */
export function setupCarouselToggle(button, container) {
  let isBuilt = false;
  let buildPromise = null;
  if (!button) {
    console.warn("Show carousel button not found. Skipping carousel initialization.");
    return undefined;
  }

  const handleClick = async () => {
    if (isBuilt) {
      container?.classList.remove("hidden");
      return;
    }

    if (!container) {
      console.error("Carousel container not found.");
      return;
    }

    if (buildPromise) {
      // Reuse the in-flight build so concurrent clicks await the same work.
      try {
        await buildPromise;
        container.classList.remove("hidden");
      } catch {
        // The original builder already reported the error.
      }
      return;
    }

    const currentBuild = (async () => {
        const judokaData = await fetchJson(`${DATA_DIR}judoka.json`);
        const gokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);

        const validJudoka = [];
        if (Array.isArray(judokaData)) {
          for (const judoka of judokaData) {
            try {
              validateData(judoka, "judoka");
              validJudoka.push(judoka);
            } catch (error) {
              console.error("Invalid judoka entry skipped:", error);
            }
          }
        } else {
          console.error("Judoka data is not an array.");
        }

        validateData(gokyoData, "gokyo");

        const carousel = await buildCardCarousel(validJudoka, gokyoData);
        container.appendChild(carousel);
        container.classList.remove("hidden");

        const containerEl = carousel.querySelector(".card-carousel");
        if (containerEl) {
          initScrollMarkers(containerEl, carousel);
        }

        isBuilt = true;
        debugLog("Carousel displayed on demand.");
      })();

    buildPromise = currentBuild;

    try {
      await currentBuild;
    } catch (error) {
      console.error("Failed to build carousel:", error);
    } finally {
      if (buildPromise === currentBuild) {
        buildPromise = null;
      }
    }
  };

  button.addEventListener("click", handleClick);
  return handleClick;
}

/**
 * Toggle the visibility of card backs within the carousel.
 *
 * @summary Attach a click handler to `button` which toggles the pressed state on
 * every judoka card button within the carousel container.
 * @pseudocode
 * 1. Exit early if `button` is missing.
 * 2. On click:
 *    a. Locate `.card-carousel` in the document.
 *    b. Query all `.judoka-card` buttons and invert their `aria-pressed` state.
 *    c. Log errors when elements are missing.
 *
 * @param {HTMLElement} button - Button that hides card faces.
 * @returns {void}
 */
export function setupHideCardButton(button) {
  if (!button) return;
  button.addEventListener("click", () => {
    const container = document.querySelector(".card-carousel");

    if (!container) {
      console.error("Carousel container not found.");
      return;
    }

    const cards = container.querySelectorAll(".judoka-card[aria-pressed]");
    if (cards.length === 0) {
      console.error("No judoka cards found in the carousel to flip.");
      return;
    }

    cards.forEach((card) => {
      card.click();
    });
  });
}

/**
 * Display a random judoka card inside `container` when `button` is clicked.
 *
 * @summary Wire `button` to generate and show a single random judoka card in `container`.
 * @pseudocode
 * 1. Exit early if `button` or `container` is missing.
 * 2. On click:
 *    a. Hide and disable `button`, then clear `container`.
 *    b. Determine motion preference with `shouldReduceMotionSync`.
 *    c. Call `generateRandomCard` using the preference.
 *    d. Ensure `button` is revealed and re-enabled after generation finishes or fails.
 *
 * @param {HTMLElement} button - Button to trigger card generation.
 * @param {HTMLElement} container - Element to display the card.
 * @returns {void}
 */
export function setupRandomCardButton(button, container) {
  if (!button || !container) return;
  button.addEventListener("click", async () => {
    button.classList.add("hidden");
    button.disabled = true;
    container.innerHTML = "";

    const prefersReducedMotion = shouldReduceMotionSync();
    try {
      await generateRandomCard(null, null, container, prefersReducedMotion, undefined, {
        enableInspector: inspectorEnabled
      });
    } finally {
      button.disabled = false;
      button.classList.remove("hidden");
    }
  });
}

/**
 * Initializes game interactions and wires control buttons for the game UI.
 *
 * @summary Find UI controls, initialize feature flags and tooltips, and wire
 * up the carousel, hide-card, and random-card buttons.
 * @pseudocode
 * 1. Query essential DOM elements by their IDs: `showRandom`, `gameArea`, `carousel-container`, `showCarousel`, and `hideCard`.
 * 2. If `showRandom` or `gameArea` elements are not found, exit silently.
 * 3. Asynchronously initialize feature flags using `initFeatureFlags`.
 * 4. Determine if the "enableCardInspector" feature is enabled with `isEnabled` and store the result in `inspectorEnabled`, defaulting to `false` on error.
 * 5. Call `toggleInspectorPanels` with the current `inspectorEnabled` state to update the visibility of inspector panels.
 * 6. Add an event listener to `featureFlagsEmitter` for "change" events:
 *    a. Re-evaluate `inspectorEnabled` using `isEnabled("enableCardInspector")`.
 *    b. Call `toggleInspectorPanels` again with the new `inspectorEnabled` state.
 * 7. Call `setupCarouselToggle` to wire up the carousel display button, passing `showCarouselButton` and `carouselContainer`.
 * 8. Call `setupHideCardButton` to wire up the button for toggling card backs, passing `hideCard`.
 * 9. Call `setupRandomCardButton` to wire up the button for displaying a random card, passing `showRandom` and `gameArea`.
 * 10. Initialize all tooltips on the page by calling `initTooltips`.
 *
 * @returns {Promise<void>} Resolves after feature flags and UI wiring complete.
 */
export async function initGame() {
  const showRandom = document.getElementById("showRandom");
  const gameArea = document.getElementById("gameArea");
  const carouselContainer = document.getElementById("carousel-container");
  const showCarouselButton = document.getElementById("showCarousel");
  const hideCard = document.getElementById("hideCard");

  if (!showRandom || !gameArea) {
    // Page does not expose game UI controls; skip wiring silently
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
}
