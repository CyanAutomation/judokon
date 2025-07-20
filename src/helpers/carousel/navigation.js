import { CAROUSEL_SCROLL_DISTANCE, CAROUSEL_SWIPE_THRESHOLD } from "../constants.js";
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
export function setupKeyboardNavigation(container) {
  container.tabIndex = 0;
  const cards = container.querySelectorAll(".judoka-card");
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
export function setupSwipeNavigation(container) {
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
