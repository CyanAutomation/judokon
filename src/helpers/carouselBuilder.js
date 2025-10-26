import { createGokyoLookup } from "./utils.js";
import { createCarouselStructure, setupResponsiveSizing, appendCards } from "./carousel/index.js";
import { CarouselController } from "./carousel/controller.js";
import { applyAccessibilityImprovements } from "./carousel/accessibility.js";
import { setupFocusHandlers } from "./carousel/focus.js";
import { setupLazyPortraits } from "./lazyPortrait.js";
import { CAROUSEL_SWIPE_THRESHOLD } from "./constants.js";
import { createSpinner } from "../components/Spinner.js";
import { getScheduler } from "./scheduler.js";
/**
 * Adds scroll markers to indicate the user's position in the carousel.
 *
 * @pseudocode
 * 1. Exit if the container or wrapper is missing.
 * 2. Exit if scroll markers already exist.
 * 3. Create a container for the markers.
 * 4. Calculate the number of pages based on card width, container width, and gap.
 * 5. Create and append a marker for each page.
 * 6. Create and append a page counter element (e.g., "Page 1 of 5").
 * 7. Append the markers container to the wrapper.
 * 8. Add a scroll event listener to the container that:
 *    a. Calculates the current page based on scroll position.
 *    b. Updates which marker is 'active'.
 *    c. Updates the page counter text.
 *
 * @param {HTMLElement} [container] - The carousel container element.
 * @param {HTMLElement} [wrapper] - The carousel wrapper element.
 * @returns {void}
 */
function addScrollMarkers(container, wrapper) {
  if (!container || !wrapper) return;
  // If a controller already created markers, leave them in place.
  const existing = wrapper.querySelector(".scroll-markers");
  if (existing) return;
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
    const gapPx = parseFloat(getComputedStyle(container).columnGap) || 0;
    const pageWidth = container.clientWidth + gapPx;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const remaining = maxScroll - container.scrollLeft;
    const currentPage =
      remaining <= 1
        ? pageCount - 1
        : pageWidth
          ? Math.min(pageCount - 1, Math.round(container.scrollLeft / pageWidth))
          : 0;

    markers.querySelectorAll(".scroll-marker").forEach((marker, index) => {
      marker.classList.toggle("active", index === currentPage);
    });
    counter.textContent = `Page ${currentPage + 1} of ${pageCount}`;
  });
}

/**
 * Initialize scroll markers after the carousel is attached to the document.
 *
 * Schedules `addScrollMarkers` for the next animation frame (or a timeout
 * fallback) so that layout measurements (offsetWidth, clientWidth) are stable.
 *
 * @pseudocode
 * 1. Verify `container` and `wrapper` are provided; return early if missing.
 * 2. Resolve a `requestAnimationFrame` implementation when available.
 * 3. Fallback to a shared scheduler timeout when RAF is unavailable.
 * 4. Schedule `addScrollMarkers(container, wrapper)` with the resolved function.
 *
 * @param {HTMLElement} [container] - The carousel container element.
 * @param {HTMLElement} [wrapper] - The carousel wrapper element.
 * @returns {void}
 */
export function initScrollMarkers(container, wrapper) {
  if (!container || !wrapper) return;
  const scheduler = typeof getScheduler === "function" ? getScheduler() : undefined;

  const globalRequestFrame =
    typeof globalThis !== "undefined" && typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : null;

  const schedulerRequestFrame =
    scheduler && typeof scheduler.requestAnimationFrame === "function"
      ? scheduler.requestAnimationFrame.bind(scheduler)
      : null;

  const scheduleNextFrame =
    globalRequestFrame ??
    schedulerRequestFrame ??
    (scheduler && typeof scheduler.setTimeout === "function"
      ? (callback) => scheduler.setTimeout(callback, 0)
      : (callback) => setTimeout(callback, 0));

  scheduleNextFrame(() => addScrollMarkers(container, wrapper));
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
 * Builds a responsive, accessible carousel of judoka cards with scroll buttons, scroll markers, and robust error handling.
 *
 * @pseudocode
 * 1. Create the base carousel DOM structure (`wrapper`, `container`, `ariaLive`) using `createCarouselStructure()`.
 * 2. Validate `judokaList`:
 *    a. If `judokaList` is invalid (e.g., empty), create a "No cards available" message, append it to `wrapper`, update `ariaLive` text, and return `wrapper`.
 * 3. Validate and transform `gokyoData` into a `gokyoLookup` object using `validateGokyoData()`.
 * 4. Determine spinner behavior:
 *    a. Check `globalThis.__forceSpinner__` or `globalThis.__showSpinnerImmediately__` to decide if the spinner should be forced to show immediately.
 *    b. Create a `spinner` instance using `createSpinner(wrapper)`, setting `delay` to 0 if forced, otherwise `undefined`.
 *    c. If `forceSpinner` is true, immediately set `spinner.element.style.display` to "block".
 *    d. Otherwise, call `spinner.show()` to display it after its configured delay.
 * 5. Asynchronously append cards to the `container` using `appendCards(container, judokaList, gokyoLookup)` and await its `ready` promise.
 * 6. Set up responsive sizing for the `container` using `setupResponsiveSizing(container)`.
 * 7. Remove the `spinner` from the DOM.
 * 8. If `forceSpinner` was true, delete the global flags `__showSpinnerImmediately__` and `__forceSpinner__`.
 * 9. Initialize the `CarouselController` with the `container`, `wrapper`, and `CAROUSEL_SWIPE_THRESHOLD`.
 * 10. Expose the `controller` instance on `wrapper._carouselController` for debugging/testing.
 * 11. Apply non-navigation accessibility helpers:
 *     a. Set up focus handlers using `setupFocusHandlers(container)`.
 *     b. Apply general accessibility improvements using `applyAccessibilityImprovements(wrapper)`.
 *     c. Set up lazy loading for judoka portraits using `setupLazyPortraits(container)`.
 * 12. Return the completed `wrapper` element.
 *
 * @param {Judoka[]} judokaList - An array of judoka objects.
 * @param {GokyoEntry[]} gokyoData - An array of gokyo objects.
 * @returns {Promise<HTMLElement>} A promise that resolves to the carousel wrapper element.
 */
export async function buildCardCarousel(judokaList, gokyoData) {
  const { wrapper, container, ariaLive } = createCarouselStructure();

  if (!validateJudokaList(judokaList)) {
    const msg = document.createElement("div");
    msg.className = "carousel-message";
    msg.textContent = "No cards available.";
    wrapper.appendChild(msg);
    ariaLive.textContent = "No cards available.";
    return wrapper;
  }

  const gokyoLookup = validateGokyoData(gokyoData);

  const forceSpinner =
    globalThis.__forceSpinner__ === true || globalThis.__showSpinnerImmediately__ === true;
  const spinner = createSpinner(wrapper, { delay: forceSpinner ? 0 : undefined });
  if (forceSpinner) {
    spinner.element.style.display = "block";
  } else {
    spinner.show();
  }

  const { ready } = appendCards(container, judokaList, gokyoLookup);
  await ready;
  setupResponsiveSizing(container);

  spinner.remove();
  if (forceSpinner) {
    delete globalThis.__showSpinnerImmediately__;
    delete globalThis.__forceSpinner__;
  }

  // Initialize unified controller (buttons, keyboard, swipe, markers, counter)
  const controller = new CarouselController(container, wrapper, {
    threshold: CAROUSEL_SWIPE_THRESHOLD
  });
  // Expose for debugging/tests if needed
  wrapper._carouselController = controller;

  // Apply non-navigation accessibility helpers
  setupFocusHandlers(container);
  applyAccessibilityImprovements(wrapper);
  setupLazyPortraits(container);

  return wrapper;
}
/**
 * Re-export `addScrollMarkers` for external usage.
 *
 * @pseudocode
 * 1. Consumers import this named export to initialize or attach scroll markers
 *    after the carousel DOM is available.
 * 2. The actual implementation is provided by `addScrollMarkers` defined
 *    earlier in this module.
 *
 * @param {HTMLElement} [container] - The carousel container element.
 * @param {HTMLElement} [wrapper] - The carousel wrapper element.
 * @returns {void}
 */
export { addScrollMarkers };

/**
 * Force the carousel spinner to appear immediately for testing.
 *
 * @pseudocode
 * 1. Set a global flag so `buildCardCarousel` shows the spinner without delay.
 *
 * @returns {void}
 */
export function showSpinnerImmediately() {
  globalThis.__showSpinnerImmediately__ = true;
}
