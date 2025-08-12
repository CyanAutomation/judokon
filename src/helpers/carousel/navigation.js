import { CAROUSEL_SWIPE_THRESHOLD } from "../constants.js";
import { CarouselController } from "./controller.js";
/**
 * Sets up keyboard navigation for the carousel container.
 *
 * @pseudocode
 * 1. Disable smooth scrolling by setting `scrollBehavior` to "auto".
 * 2. Make the container focusable by setting `tabIndex` to 0.
 * 3. Add a `keydown` event listener to the container.
 *    - Ignore events that do not originate from the container or are not
 *      "ArrowLeft"/"ArrowRight".
 *    - When "ArrowLeft" is pressed:
 *      - Prevent the default behavior.
 *      - Scroll left by one page width plus gap.
 *    - When "ArrowRight" is pressed:
 *      - Prevent the default behavior.
 *      - Scroll right by one page width plus gap.
 *
 * @param {HTMLElement} container - The carousel container element.
 */
export function setupKeyboardNavigation(container) {
  // Thin wrapper: if a controller exists, it already wires keyboard events.
  const wrapper = container.parentElement;
  if (wrapper && wrapper._carouselController) return;
  container.style.scrollBehavior = "auto";
  container.tabIndex = 0;
  container.addEventListener("keydown", (event) => {
    if (event.target !== container || (event.key !== "ArrowLeft" && event.key !== "ArrowRight"))
      return;
    event.preventDefault();
    const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
    const scrollAmount = container.clientWidth + gap;
    const delta = event.key === "ArrowLeft" ? -scrollAmount : scrollAmount;
    container.scrollLeft += delta;
  });
}

/**
 * Sets up swipe navigation for the carousel container, supporting touch and pointer events.
 *
 * @pseudocode
 * 1. Track the starting X position of a touch or pointer press (`touchstart` or `pointerdown`).
 * 2. On `touchend` or `pointerup`, calculate the swipe distance.
 *    - Determine the next scroll position from the current `scrollLeft` plus or minus one page width.
 *    - Clamp this value to the scrollable range and scroll the container to that position immediately.
 *
 * @param {HTMLElement} container - The carousel container element.
 */
export function setupSwipeNavigation(container) {
  // Thin wrapper: if a controller exists, it already wires swipe/pointer events.
  const wrapper = container.parentElement;
  if (wrapper && wrapper._carouselController) return;

  let touchStartX = 0;
  let pointerStartX = 0;

  const scrollFromDelta = (delta) => {
    const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
    const step = container.clientWidth + gap;
    let left = container.scrollLeft;
    if (delta > CAROUSEL_SWIPE_THRESHOLD) {
      left -= step;
    } else if (delta < -CAROUSEL_SWIPE_THRESHOLD) {
      left += step;
    } else {
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    left = Math.max(0, Math.min(left, maxScroll));
    container.scrollTo({ left, behavior: "smooth" });
  };

  container.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0].clientX;
  });
  container.addEventListener("touchend", (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const swipeDistance = touchEndX - touchStartX;
    scrollFromDelta(swipeDistance);
  });

  container.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") {
      pointerStartX = event.clientX;
    }
  });
  container.addEventListener("pointerup", (event) => {
    if (event.pointerType !== "touch") {
      const pointerEndX = event.clientX;
      const swipeDistance = pointerEndX - pointerStartX;
      scrollFromDelta(swipeDistance);
    }
  });
}

/**
 * Create scroll buttons and synchronize their disabled state with the
 * container's scroll position.
 *
 * @pseudocode
 * 1. Build a `buttons` map with `left` and `right` using `createScrollButton`.
 * 2. Append `left`, `container`, and `right` to `wrapper` in that order.
 * 3. Define `updateButtons` via `updateScrollButtonState`.
 * 4. Call `updateButtons` initially, on `scroll` (with a delayed recheck) and
 *    on `resize`.
 *
 * @param {HTMLElement} container - Carousel container element.
 * @param {HTMLElement} wrapper - Wrapper element to hold buttons and container.
 */
// wireCarouselNavigation has been superseded by CarouselController.
// Intentionally removed to avoid duplicate button/marker mounting.
