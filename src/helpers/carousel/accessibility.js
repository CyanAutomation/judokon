import { setupFocusHandlers } from "./focus.js";
import { setupLazyPortraits } from "../lazyPortrait.js";
import { CarouselController } from "./controller.js";

const MIN_TOUCH_TARGET_SIZE = 48;

/**
 * Ensure a carousel control meets minimum touch target dimensions.
 *
 * @pseudocode
 * 1. Read the computed width and height of `element`.
 * 2. If either dimension is below `MIN_TOUCH_TARGET_SIZE`, set `minWidth`,
 *    `minHeight`, and apply padding to enlarge the target.
 *
 * @param {HTMLElement} element - Button or element to adjust.
 */
function ensureTouchTargetSize(element) {
  const style = window.getComputedStyle(element);
  const width = parseInt(style.width, 10);
  const height = parseInt(style.height, 10);
  if (width < MIN_TOUCH_TARGET_SIZE || height < MIN_TOUCH_TARGET_SIZE) {
    element.style.minWidth = `${MIN_TOUCH_TARGET_SIZE}px`;
    element.style.minHeight = `${MIN_TOUCH_TARGET_SIZE}px`;
    element.style.padding = "var(--space-sm)";
  }
}

/**
 * Apply basic accessibility adjustments to a carousel wrapper.
 *
 * @pseudocode
 * 1. Select all `.scroll-button` elements and call `ensureTouchTargetSize` on each.
 * 2. Update card text color to ensure contrast against backgrounds.
 *
 * @param {HTMLElement} wrapper - Carousel wrapper element.
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
export function applyAccessibilityImprovements(wrapper) {
  const buttons = wrapper.querySelectorAll(".scroll-button");
  buttons.forEach((button) => ensureTouchTargetSize(button));
  const cards = wrapper.querySelectorAll(".judoka-card");
  cards.forEach((card) => {
    card.style.color = "var(--color-text-inverted)";
  });
}

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
export { ensureTouchTargetSize };

/**
 * Initialize carousel accessibility and interaction helpers.
 *
 * @pseudocode
 * 1. Check if `wrapper` exists and if `wrapper._carouselController` is not already set.
 *    a. If these conditions are met, instantiate a new `CarouselController` with the `container`, `wrapper`, and an empty options object (using default threshold).
 *    b. Assign this new controller instance to `wrapper._carouselController`. This ensures a unified controller is available for consistent navigation behavior, especially if it wasn't created by the carousel builder.
 * 2. Call `setupFocusHandlers(container)` to set up focus management for the carousel cards.
 * 3. Call `applyAccessibilityImprovements(wrapper)` to apply general accessibility adjustments to the carousel wrapper and its controls.
 * 4. Call `setupLazyPortraits(container)` to enable lazy loading for judoka portrait images within the carousel.
 *
 * @param {HTMLElement} container - Carousel container element.
 * @param {HTMLElement} wrapper - Carousel wrapper element.
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
export function initAccessibility(container, wrapper) {
  // Ensure a unified controller exists for consistent navigation behavior.
  if (wrapper && !wrapper._carouselController) {
    // Instantiate with default threshold; builder may already have created one.
    wrapper._carouselController = new CarouselController(container, wrapper, {});
  }
  setupFocusHandlers(container);
  applyAccessibilityImprovements(wrapper);
  setupLazyPortraits(container);
}
