import { createGokyoLookup } from "./utils.js";

import { setupLazyPortraits } from "./lazyPortrait.js";
import {
  createScrollButton,
  updateScrollButtonState,
  setupKeyboardNavigation,
  setupSwipeNavigation,
  applyAccessibilityImprovements,
  setupResponsiveSizing,
  appendCards,
  setupFocusHandlers
} from "./carousel/index.js";
import { SPINNER_DELAY_MS } from "./constants.js";

/**
 * Adds scroll markers to indicate the user's position in the carousel.
 *
 * @pseudocode
 * 1. Validate inputs and exit early if `container` or `wrapper` is missing.
 * 2. Create a `<div>` element with the class `scroll-markers`.
 * 3. Determine how many cards fit within one page of the carousel,
 *    accounting for the gap between cards and ensuring at least one
 *    card per page. Calculate the total page count.
 * 4. Add a marker for each page and an accompanying page counter.
 *    - Highlight the marker for the current page.
 * 5. Update the active marker and counter text on scroll events.
 *
 * @param {HTMLElement} [container] - The carousel container element.
 * @param {HTMLElement} [wrapper] - The carousel wrapper element.
 */
function addScrollMarkers(container, wrapper) {
  if (!container || !wrapper) return;
  const existing = wrapper.querySelector(".scroll-markers");
  if (existing) existing.remove();
  const markers = document.createElement("div");
  markers.className = "scroll-markers";

  const cards = container.querySelectorAll(".judoka-card");
  const firstCard = cards[0];
  const cardWidth = firstCard ? firstCard.offsetWidth : 0;
  const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
  const cardsPerPage = cardWidth
    ? Math.max(1, Math.floor((container.clientWidth + gap) / (cardWidth + gap)))
    : 1;
  const pageCount = Math.ceil(cards.length / cardsPerPage);

  for (let i = 0; i < pageCount; i++) {
    const marker = document.createElement("span");
    marker.className = "scroll-marker";
    if (i === 0) marker.classList.add("active");
    markers.appendChild(marker);
  }

  const counter = document.createElement("span");
  counter.className = "page-counter";
  counter.setAttribute("aria-live", "polite");
  counter.textContent = `Page 1 of ${pageCount}`;
  markers.appendChild(counter);

  wrapper.appendChild(markers);

  container.addEventListener("scroll", () => {
    const scrollLeft = container.scrollLeft;
    const activeCardIndex = cardWidth ? Math.round(scrollLeft / cardWidth) : 0;
    const currentPage = Math.min(pageCount - 1, Math.floor(activeCardIndex / cardsPerPage));

    markers.querySelectorAll(".scroll-marker").forEach((marker, index) => {
      marker.classList.toggle("active", index === currentPage);
    });
    counter.textContent = `Page ${currentPage + 1} of ${pageCount}`;
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
export function createLoadingSpinner(wrapper) {
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

/**
 * Builds a responsive, accessible carousel of judoka cards with scroll buttons, scroll markers, and robust error handling.
 *
 * @pseudocode
 * 1. Validate input parameters and handle empty or failed data loads with error messages and retry support.
 * 2. Create a carousel container with scroll-snap and responsive card sizing (1–2 cards on mobile, 3–5 on desktop).
 * 3. Add a loading spinner if loading exceeds 2 seconds.
 * 4. For each judoka:
 *    a. Validate fields; use fallback card if invalid.
 *    b. Generate card, handle broken images, and make focusable.
 * 5. Add scroll buttons and markers, ensuring ARIA roles/labels.
 *    - Update button state on scroll and after scroll-snap completes.
 * 6. Use ResizeObserver to adapt card sizing and scroll marker logic on window resize.
 * 7. Enable keyboard navigation (arrow keys), swipe gestures, and focus/hover enlargement for the center card only.
 * 8. Provide aria-live region for dynamic messages (errors, empty state).
 * 9. Return the completed wrapper element.
 *
 * @param {Judoka[]} judokaList - An array of judoka objects.
 * @param {GokyoEntry[]} gokyoData - An array of gokyo objects.
 * @returns {Promise<HTMLElement>} A promise that resolves to the carousel wrapper element.
 */
export async function buildCardCarousel(judokaList, gokyoData) {
  // --- Accessibility: aria-live region for dynamic messages ---
  const ariaLive = document.createElement("div");
  ariaLive.setAttribute("aria-live", "polite");
  ariaLive.className = "carousel-aria-live";

  if (!validateJudokaList(judokaList)) {
    const wrapper = document.createElement("div");
    wrapper.className = "carousel-container";
    const msg = document.createElement("div");
    msg.className = "carousel-message";
    msg.textContent = "No cards available.";
    wrapper.appendChild(msg);
    wrapper.appendChild(ariaLive);
    ariaLive.textContent = "No cards available.";
    return wrapper;
  }

  const gokyoLookup = validateGokyoData(gokyoData);

  const container = document.createElement("div");
  container.className = "card-carousel";
  container.dataset.testid = "carousel";
  container.setAttribute("role", "list");
  container.setAttribute("aria-label", "Judoka card carousel");
  // Responsive scroll snap
  container.style.scrollSnapType = "x mandatory";
  container.style.overflowX = "auto";
  container.style.display = "flex";
  container.style.gap = "var(--carousel-gap, 1rem)";

  const wrapper = document.createElement("div");
  wrapper.className = "carousel-container";
  wrapper.appendChild(ariaLive);

  const { spinner, timeoutId } = createLoadingSpinner(wrapper);

  // Create cards and responsive sizing
  await appendCards(container, judokaList, gokyoLookup);
  setupResponsiveSizing(container);

  clearTimeout(timeoutId);
  spinner.style.display = "none";

  // Responsive sizing handled by helper

  const leftButton = createScrollButton("left", container);
  const rightButton = createScrollButton("right", container);

  wrapper.appendChild(leftButton);
  wrapper.appendChild(container);
  wrapper.appendChild(rightButton);

  // Add scroll markers below the carousel
  addScrollMarkers(container, wrapper);

  const updateButtons = () => updateScrollButtonState(container, leftButton, rightButton);

  let scrollTimeout;
  const handleScroll = () => {
    updateButtons();
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateButtons, 100); // re-check after snap
  };

  updateButtons();
  container.addEventListener("scroll", handleScroll);
  window.addEventListener("resize", updateButtons);

  setupFocusHandlers(container);
  setupKeyboardNavigation(container);
  setupSwipeNavigation(container);
  applyAccessibilityImprovements(wrapper);
  setupLazyPortraits(container);

  // --- Error handling: network failure/retry ---
  // (Assume this is handled at a higher level, but aria-live region is ready)

  return wrapper;
}

export { addScrollMarkers };
