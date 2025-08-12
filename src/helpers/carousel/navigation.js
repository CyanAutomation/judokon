import { CAROUSEL_SWIPE_THRESHOLD } from "../constants.js";
import { createScrollButton, updateScrollButtonState } from "./scroll.js";
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
  // Deprecated: Handled by CarouselController.
  // Kept as a thin no-op to prevent double-binding in legacy call sites.
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
  // Deprecated: Handled by CarouselController.
  // Kept as a thin no-op to prevent double-binding in legacy call sites.
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
export function wireCarouselNavigation(container, wrapper) {
  // Thin wrapper to maintain API while delegating to the unified controller.
  const parent = wrapper || container.parentElement;
  if (!parent) return;
  if (!parent._carouselController) {
    parent._carouselController = new CarouselController(container, parent, {
      threshold: CAROUSEL_SWIPE_THRESHOLD
    });
  } else {
    parent._carouselController.update();
  }
}
