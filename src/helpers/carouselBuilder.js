import { createGokyoLookup } from "./utils.js";
import { generateJudokaCard } from "./cardBuilder.js";
import { fetchJson } from "./dataUtils.js";
import {
  DATA_DIR,
  CAROUSEL_SCROLL_DISTANCE,
  CAROUSEL_SWIPE_THRESHOLD,
  SPINNER_DELAY_MS
} from "./constants.js";

let fallbackJudoka;

async function getFallbackJudoka() {
  if (fallbackJudoka) {
    return fallbackJudoka;
  }
  try {
    const data = await fetchJson(`${DATA_DIR}judoka.json`);
    if (Array.isArray(data)) {
      fallbackJudoka = data.find((j) => j.id === 0) || null;
    }
    if (!fallbackJudoka) {
      throw new Error("Fallback judoka with id 0 not found");
    }
  } catch (error) {
    console.error("Failed to load fallback judoka:", error);
    fallbackJudoka = {
      id: 0,
      firstname: "Unknown",
      surname: "Judoka",
      country: "Unknown",
      countryCode: "N/A",
      weightClass: "N/A",
      stats: { power: 0, speed: 0, technique: 0, kumikata: 0, newaza: 0 },
      signatureMoveId: 0,
      rarity: "common"
    };
  }
  return fallbackJudoka;
}

/**
 * Creates a scroll button with the specified direction and functionality.
 *
 * @pseudocode
 * 1. Validate the input parameters:
 *    - Ensure `direction` is either "left" or "right".
 *    - Ensure `container` is a valid DOM element.
 *    - Throw an error if validation fails.
 *
 * 2. Create a button element:
 *    - Assign a class based on the `direction` (e.g., "scroll-button left" or "scroll-button right").
 *    - Set the inner HTML to display an arrow symbol ("<" for left, ">" for right).
 *    - Add an accessible label (`aria-label`) for screen readers (e.g., "Scroll Left").
 *
 * 3. Add a click event listener to the button:
 *    - Scroll the `container` by the specified `scrollAmount`.
 *    - Use smooth scrolling for better user experience.
 *
 * 4. Return the created button element.
 *
 * @param {String} direction - Either "left" or "right".
 * @param {HTMLElement} container - The carousel container to scroll.
 * @param {Number} scrollAmount - The amount to scroll in pixels.
 * @returns {HTMLElement} The scroll button element.
 *
 * Note: The function assumes `scrollAmount` is a number and does not
 * perform validation. Invalid values will simply be passed to
 * `scrollBy` without throwing an error.
 */
export function createScrollButton(direction, container, scrollAmount) {
  if (direction !== "left" && direction !== "right") {
    throw new Error("Invalid direction: must be 'left' or 'right'");
  }

  if (!container) {
    throw new Error("Container is required");
  }

  const button = document.createElement("button");

  button.className = `scroll-button ${direction}`;

  button.innerHTML = direction === "left" ? "&lt;" : "&gt;";

  button.setAttribute(
    "aria-label",
    `Scroll ${direction.charAt(0).toUpperCase() + direction.slice(1)}`
  );

  button.addEventListener("click", () => {
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    });
  });

  return button;
}

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
 * Sets up keyboard navigation for the carousel container.
 *
 * @pseudocode
 * 1. Make the container focusable by setting `tabIndex` to 0.
 * 2. Add a `keydown` event listener to the container.
 *    - Scroll left when the "ArrowLeft" key is pressed and focus the previous card.
 *    - Scroll right when the "ArrowRight" key is pressed and focus the next card.
 *
 * @param {HTMLElement} container - The carousel container element.
 */
function setupKeyboardNavigation(container) {
  container.tabIndex = 0; // Make the carousel focusable
  const cards = container.querySelectorAll(".judoka-card"); // Cache the NodeList
  container.addEventListener("keydown", (event) => {
    const active = document.activeElement;
    const index = Array.from(cards).indexOf(active);

    if (event.key === "ArrowLeft") {
      container.scrollBy({ left: -CAROUSEL_SCROLL_DISTANCE, behavior: "smooth" });
      const prevIndex = index > 0 ? index - 1 : 0;
      cards[prevIndex]?.focus();
    } else if (event.key === "ArrowRight") {
      container.scrollBy({ left: CAROUSEL_SCROLL_DISTANCE, behavior: "smooth" });
      const nextIndex = index >= 0 ? Math.min(cards.length - 1, index + 1) : 0;
      cards[nextIndex]?.focus();
    }
  });
}

/**
 * Sets up swipe navigation for the carousel container.
 *
 * @pseudocode
 * 1. Track the starting X position of a touch event (`touchstart`).
 * 2. Track the ending X position of a touch event (`touchend`).
 * 3. Calculate the swipe distance and direction.
 *    - Scroll left if the swipe distance is greater than 50 pixels.
 *    - Scroll right if the swipe distance is less than -50 pixels.
 *
 * @param {HTMLElement} container - The carousel container element.
 */
function setupSwipeNavigation(container) {
  let touchStartX = 0;

  container.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0].clientX;
  });

  container.addEventListener("touchend", (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartX;

    if (swipeDistance > CAROUSEL_SWIPE_THRESHOLD) {
      container.scrollBy({ left: -CAROUSEL_SCROLL_DISTANCE, behavior: "smooth" });
    } else if (swipeDistance < -CAROUSEL_SWIPE_THRESHOLD) {
      container.scrollBy({ left: CAROUSEL_SCROLL_DISTANCE, behavior: "smooth" });
    }
  });
}

// Ensure WCAG compliance for touch target sizes and contrast ratios

// Adjust button sizes for touch targets
const MIN_TOUCH_TARGET_SIZE = 48;

function ensureTouchTargetSize(element) {
  const style = window.getComputedStyle(element);
  const width = parseInt(style.width, 10);
  const height = parseInt(style.height, 10);

  if (width < MIN_TOUCH_TARGET_SIZE || height < MIN_TOUCH_TARGET_SIZE) {
    element.style.minWidth = `${MIN_TOUCH_TARGET_SIZE}px`;
    element.style.minHeight = `${MIN_TOUCH_TARGET_SIZE}px`;
    element.style.padding = "10px"; // Add padding for better usability
  }
}

// Apply touch target size adjustments to scroll buttons
function applyAccessibilityImprovements(wrapper) {
  const buttons = wrapper.querySelectorAll(".scroll-button");
  buttons.forEach((button) => ensureTouchTargetSize(button));

  // Ensure contrast ratios for text and background
  const cards = wrapper.querySelectorAll(".judoka-card");
  cards.forEach((card) => {
    card.style.color = "#000"; // Ensure text is dark for contrast
    card.style.backgroundColor = "#fff"; // Ensure background is light for contrast
  });
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
 *    - Validate each judoka object (ensure required fields are present).
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

    if (
      !judoka.firstname ||
      !judoka.surname ||
      !judoka.country ||
      !judoka.stats ||
      judoka.signatureMoveId === undefined
    ) {
      console.error("Invalid judoka object:", judoka);
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

  setupKeyboardNavigation(container);
  setupSwipeNavigation(container);
  addScrollMarkers(container, wrapper);
  applyAccessibilityImprovements(wrapper);

  return wrapper;
}

export { addScrollMarkers };
