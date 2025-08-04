import { CAROUSEL_SWIPE_THRESHOLD } from "../constants.js";
/**
 * Sets up keyboard navigation for the carousel container.
 *
 * @pseudocode
 * 1. Make the container focusable by setting `tabIndex` to 0.
 * 2. Add a `keydown` event listener to the container.
 *    - When the container is focused and "ArrowLeft" is pressed:
 *      - Prevent the default behavior.
 *      - Scroll left by one container width and dispatch a `scroll` event.
 *    - When the container is focused and "ArrowRight" is pressed:
 *      - Prevent the default behavior.
 *      - Scroll right by one container width and dispatch a `scroll` event.
 *
 * @param {HTMLElement} container - The carousel container element.
 */
export function setupKeyboardNavigation(container) {
  container.tabIndex = 0;
  container.addEventListener("keydown", (event) => {
    if (document.activeElement !== container) return;
    const scrollAmount = container.clientWidth;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (typeof container.scrollBy === "function") {
        container.scrollBy({ left: -scrollAmount });
      } else {
        container.scrollLeft -= scrollAmount;
      }
      container.dispatchEvent(new Event("scroll"));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (typeof container.scrollBy === "function") {
        container.scrollBy({ left: scrollAmount });
      } else {
        container.scrollLeft += scrollAmount;
      }
      container.dispatchEvent(new Event("scroll"));
    }
  });
}

/**
 * Sets up swipe navigation for the carousel container, supporting touch and pointer events.
 *
 * @pseudocode
 * 1. Track the starting X position of a touch or pointer press (`touchstart` or `pointerdown`).
 * 2. On `touchend` or `pointerup`, calculate the swipe distance.
 *    - Update a `targetLeft` value by one container width in the swipe direction.
 *    - Clamp `targetLeft` to the scrollable range and smoothly scroll the container to that position.
 *
 * @param {HTMLElement} container - The carousel container element.
 */
export function setupSwipeNavigation(container) {
  let touchStartX = 0;
  let pointerStartX = 0;
  let targetLeft = container.scrollLeft;

  const scrollFromDelta = (delta) => {
    const step = container.clientWidth;
    if (delta > CAROUSEL_SWIPE_THRESHOLD) {
      targetLeft -= step;
    } else if (delta < -CAROUSEL_SWIPE_THRESHOLD) {
      targetLeft += step;
    } else {
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    targetLeft = Math.max(0, Math.min(targetLeft, maxScroll));
    container.scrollTo({ left: targetLeft, behavior: "smooth" });
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
