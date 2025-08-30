import { CAROUSEL_SWIPE_THRESHOLD } from "../constants.js";
/**
 * Sets up keyboard navigation for the carousel container.
 *
 * @pseudocode
 * 1. Check if a `_carouselController` already exists on the `wrapper` (parent element of `container`). If so, exit early as keyboard events are already handled by the controller.
 * 2. Set the `scrollBehavior` style of the `container` to "auto" to ensure instant scrolling.
 * 3. Set the `tabIndex` of the `container` to 0 to make it focusable via keyboard.
 * 4. Add a "keydown" event listener to the `container`:
 *    a. Inside the event listener, check if the `event.target` is not the `container` itself, or if the pressed key (`event.key`) is neither "ArrowLeft" nor "ArrowRight". If any of these conditions are true, exit the handler.
 *    b. Prevent the default browser action for the keydown event (`event.preventDefault()`).
 *    c. Get the `gap` between columns from the computed style of the `container`.
 *    d. Calculate `scrollAmount` as the `container.clientWidth` plus the `gap`. This represents one page width.
 *    e. Determine `delta`: If the key is "ArrowLeft", `delta` is `-scrollAmount`; otherwise (for "ArrowRight"), `delta` is `scrollAmount`.
 *    f. Update the `container.scrollLeft` by adding `delta` to it, effectively scrolling the carousel.
 *
 * @param {HTMLElement} container - The carousel container element.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
 * 1. Check if a `_carouselController` already exists on the `wrapper` (parent element of `container`). If so, exit early as swipe events are already handled by the controller.
 * 2. Initialize `touchStartX` and `pointerStartX` to 0 to store the starting X-coordinates for touch and pointer events, respectively.
 * 3. Define a `scrollFromDelta` helper function that takes `delta` (the swipe distance):
 *    a. Get the `gap` between columns from the computed style of the `container`.
 *    b. Calculate `step` as the `container.clientWidth` plus the `gap`, representing one page width.
 *    c. Initialize `left` with the current `container.scrollLeft`.
 *    d. If `delta` is greater than `CAROUSEL_SWIPE_THRESHOLD`, decrement `left` by `step` (swipe right, go left).
 *    e. Else if `delta` is less than negative `CAROUSEL_SWIPE_THRESHOLD`, increment `left` by `step` (swipe left, go right).
 *    f. Else (swipe distance is within threshold), exit the helper function.
 *    g. Calculate `maxScroll` as the maximum scrollable width of the `container`.
 *    h. Clamp `left` to ensure it stays within the valid scrollable range (between 0 and `maxScroll`).
 *    i. Scroll the `container` to the calculated `left` position with smooth behavior.
 * 4. Add a "touchstart" event listener to the `container`:
 *    a. Store the `clientX` of the first touch in `touchStartX`.
 * 5. Add a "touchend" event listener to the `container`:
 *    a. Get the `clientX` of the first changed touch.
 *    b. Calculate `swipeDistance` as the difference between `touchEndX` and `touchStartX`.
 *    c. Call `scrollFromDelta` with `swipeDistance`.
 * 6. Add a "pointerdown" event listener to the `container`:
 *    a. If the `event.pointerType` is not "touch", store the `clientX` in `pointerStartX`.
 * 7. Add a "pointerup" event listener to the `container`:
 *    a. If the `event.pointerType` is not "touch", calculate `swipeDistance` and call `scrollFromDelta`.
 *
 * @param {HTMLElement} container - The carousel container element.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
