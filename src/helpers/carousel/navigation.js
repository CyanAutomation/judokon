import { CAROUSEL_SWIPE_THRESHOLD } from "../constants.js";
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
    const scrollAmount = container.clientWidth;
    const active = document.activeElement;
    const index = Array.from(cards).indexOf(active);
    if (event.key === "ArrowLeft") {
      container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      const prevIndex = index > 0 ? index - 1 : 0;
      cards[prevIndex]?.focus();
    } else if (event.key === "ArrowRight") {
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
      const nextIndex = index >= 0 ? Math.min(cards.length - 1, index + 1) : 0;
      cards[nextIndex]?.focus();
    }
  });
}

/**
 * Sets up swipe navigation for the carousel container, supporting touch and pointer events.
 *
 * @pseudocode
 * 1. Track the starting X position of a touch or pointer press (`touchstart` or `pointerdown`).
 * 2. On `touchend` or `pointerup`, calculate the swipe distance.
 *    - Scroll left if the swipe distance is greater than the carousel swipe threshold.
 *    - Scroll right if the swipe distance is less than the negative carousel swipe threshold.
 *
 * @param {HTMLElement} container - The carousel container element.
 */
export function setupSwipeNavigation(container) {
  let touchStartX = 0;
  let pointerStartX = 0;

  const scrollFromDelta = (delta) => {
    const scrollAmount = container.clientWidth;
    if (delta > CAROUSEL_SWIPE_THRESHOLD) {
      container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    } else if (delta < -CAROUSEL_SWIPE_THRESHOLD) {
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
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
