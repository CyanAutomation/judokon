import { createGokyoLookup } from "./utils.js";
import { generateJudokaCard } from "./cardBuilder.js";
import { getFallbackJudoka } from "./judokaUtils.js";
import { setupLazyPortraits } from "./lazyPortrait.js";
import {
  createScrollButton,
  updateScrollButtonState,
  setupKeyboardNavigation,
  setupSwipeNavigation,
  applyAccessibilityImprovements
} from "./carousel/index.js";
import { CAROUSEL_SCROLL_DISTANCE, SPINNER_DELAY_MS } from "./constants.js";
import { getMissingJudokaFields, hasRequiredJudokaFields } from "./judokaValidation.js";

/**
 * Adds scroll markers to indicate the user's position in the carousel.
 *
 * @pseudocode
 * 1. Validate inputs and exit early if `container` or `wrapper` is missing.
 * 2. Create a `<div>` element with the class `scroll-markers`.
 * 3. Add markers for each card in the carousel.
 *    - Highlight the marker corresponding to the currently visible card.
 * 4. Update the highlighted marker on scroll events.
 *
 * @param {HTMLElement} [container] - The carousel container element.
 * @param {HTMLElement} [wrapper] - The carousel wrapper element.
 */
function addScrollMarkers(container, wrapper) {
  if (!container || !wrapper) return;
  const markers = document.createElement("div");
  markers.className = "scroll-markers";

  const cards = container.querySelectorAll(".judoka-card");
  cards.forEach((_, index) => {
    const marker = document.createElement("span");
    marker.className = "scroll-marker";
    if (index === 0) marker.classList.add("active");
    markers.appendChild(marker);
  });

  wrapper.appendChild(markers);

  const firstCard = container.querySelector(".judoka-card");
  const cardWidth = firstCard ? firstCard.offsetWidth : 0;

  container.addEventListener("scroll", () => {
    const scrollLeft = container.scrollLeft;
    const activeIndex = cardWidth ? Math.round(scrollLeft / cardWidth) : 0;

    markers.querySelectorAll(".scroll-marker").forEach((marker, index) => {
      marker.classList.toggle("active", index === activeIndex);
    });
  });
}

/**
 * Validates the judoka list to ensure it is a non-empty array.
 *
 * @pseudocode
 * 1. Check if `judokaList` is an array and contains at least one element.
 *    - Log an error if validation fails.
 * 2. Return `true` if validation passes, otherwise return `false`.
 *
 * @param {Judoka[]} judokaList - An array of judoka objects.
 * @returns {Boolean} Whether the judoka list is valid.
 */
function validateJudokaList(judokaList) {
  if (!Array.isArray(judokaList) || judokaList.length === 0) {
    console.error("No judoka data available to build the carousel.");
    return false;
  }
  return true;
}

/**
 * Validates gokyo data and transforms it into a lookup object.
 *
 * @pseudocode
 * 1. Check if `gokyoData` is an array and contains at least one element.
 *    - Log a warning if validation fails and default to an empty lookup.
 * 2. Transform `gokyoData` into a lookup object using `createGokyoLookup`.
 * 3. Return the lookup object.
 *
 * @param {GokyoEntry[]} gokyoData - An array of gokyo objects.
 * @returns {Object} A lookup object for gokyo data.
 */
function validateGokyoData(gokyoData) {
  if (!Array.isArray(gokyoData) || gokyoData.length === 0) {
    console.warn("No gokyo data provided. Defaulting to an empty lookup.");
  }
  return createGokyoLookup(gokyoData);
}

/**
 * Creates a loading spinner and sets a timeout to display it.
 *
 * @pseudocode
 * 1. Create a `<div>` element with the class `loading-spinner`.
 * 2. Append the spinner to the provided `wrapper` element.
 * 3. Set a timeout to display the spinner after 2 seconds.
 * 4. Return the spinner element and the timeout ID.
 *
 * @param {HTMLElement} wrapper - The wrapper element to append the spinner to.
 * @returns {Object} An object containing the spinner element and timeout ID.
 */
function createLoadingSpinner(wrapper) {
  const spinner = document.createElement("div");
  spinner.className = "loading-spinner";
  wrapper.appendChild(spinner);

  const timeoutId = setTimeout(() => {
    spinner.style.display = "block";
  }, SPINNER_DELAY_MS);

  return { spinner, timeoutId };
}

/**
 * Handles broken images in a card by setting a fallback image.
 *
 * @pseudocode
 * 1. Find the `<img>` element within the provided `card`.
 * 2. Attach an `onerror` event handler to the image.
 *    - Replace the image source with a fallback image if an error occurs.
 *
 * @param {HTMLElement} card - The card element containing the image.
 */
function handleBrokenImages(card) {
  const img = card.querySelector("img");
  if (img) {
    img.onerror = () => {
      img.src = "./assets/cardBacks/cardBack-2.png";
    };
  }
}

/**
 * Builds a carousel of judoka cards with scroll buttons.
 *
 * @pseudocode
 * 1. Validate the input parameters:
 *    - Ensure `judokaList` is a non-empty array.
 *    - Ensure `gokyoData` is an array (default to an empty lookup if missing).
 *    - Log warnings or errors for invalid inputs.
 *
 * 2. Create the carousel container:
 *    - Create a `<div>` element with the class `card-carousel`.
 *
 * 3. Create a wrapper element for the carousel:
 *    - Create a `<div>` element with the class `carousel-container`.
 *    - Add a loading spinner to indicate progress.
 *
 * 4. Transform `gokyoData` into a lookup object for quick access.
 *
 * 5. Loop through the `judokaList` array:
 *    - Validate each judoka object using `hasRequiredJudokaFields`.
 *    - Generate a card using `generateJudokaCard`.
 *    - If validation fails or card generation returns `null`, load the fallback
 *      judoka (id `0`) and generate its card instead.
 *    - Handle broken card images by setting a fallback image.
 *    - Append the generated card to the carousel container.
 *    - Make the card focusable by setting `tabIndex`.
 *
 * 6. Remove the loading spinner once all cards are processed.
 *
 * 7. Create and append scroll buttons:
 *    - Create a left scroll button to scroll the carousel left.
 *    - Create a right scroll button to scroll the carousel right.
 *    - Append both buttons to the wrapper.
 *
 * 8. Add keyboard navigation:
 *    - Enable scrolling with the left and right arrow keys.
 *    - Move focus to the next or previous card after scrolling.
 *
 * 9. Add swipe functionality for touch devices:
 *    - Detect swipe gestures to scroll the carousel left or right.
 *
 * 10. Return the completed wrapper element.
 *
 * @param {Judoka[]} judokaList - An array of judoka objects.
 * @param {GokyoEntry[]} gokyoData - An array of gokyo objects.
 * @returns {Promise<HTMLElement>} A promise that resolves to the carousel wrapper element.
 */
export async function buildCardCarousel(judokaList, gokyoData) {
  if (!validateJudokaList(judokaList)) {
    return document.createElement("div");
  }

  const gokyoLookup = validateGokyoData(gokyoData);

  const container = document.createElement("div");
  container.className = "card-carousel";
  container.dataset.testid = "carousel";

  const wrapper = document.createElement("div");
  wrapper.className = "carousel-container";

  const { spinner, timeoutId } = createLoadingSpinner(wrapper);

  for (const judoka of judokaList) {
    let entry = judoka;

    if (!hasRequiredJudokaFields(judoka)) {
      console.error("Invalid judoka object:", judoka);
      const missing = getMissingJudokaFields(judoka).join(", ");
      console.error(`Missing fields: ${missing}`);
      entry = await getFallbackJudoka();
    }

    let card = await generateJudokaCard(entry, gokyoLookup, container);

    if (!card) {
      console.warn("Failed to generate card for judoka:", entry);
      const fallback = await getFallbackJudoka();
      card = await generateJudokaCard(fallback, gokyoLookup, container);
    }

    if (card) {
      handleBrokenImages(card);
      card.tabIndex = 0;
    }
  }

  clearTimeout(timeoutId);
  spinner.style.display = "none";

  const leftButton = createScrollButton("left", container, CAROUSEL_SCROLL_DISTANCE);
  const rightButton = createScrollButton("right", container, CAROUSEL_SCROLL_DISTANCE);

  wrapper.appendChild(leftButton);
  wrapper.appendChild(container);
  wrapper.appendChild(rightButton);

  const updateButtons = () => updateScrollButtonState(container, leftButton, rightButton);
  updateButtons();
  container.addEventListener("scroll", updateButtons);
  window.addEventListener("resize", updateButtons);

  setupKeyboardNavigation(container);
  setupSwipeNavigation(container);
  applyAccessibilityImprovements(wrapper);
  setupLazyPortraits(container);

  return wrapper;
}

export { addScrollMarkers };
