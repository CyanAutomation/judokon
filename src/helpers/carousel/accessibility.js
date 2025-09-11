import { setupFocusHandlers } from "./focus.js";
import { setupLazyPortraits } from "../lazyPortrait.js";
import { CarouselController } from "./controller.js";

const MIN_TOUCH_TARGET_SIZE = 48;

/**
 * Ensure a carousel control meets minimum touch target dimensions.
 *
 * A small control can be hard to tap on touch devices; this helper ensures
 * controls meet the recommended minimum target size (48x48px) and applies
 * minimal padding when necessary to enlarge the interactive area.
 *
 * @pseudocode
 * 1. Get the computed style of the element.
 * 2. Parse its width and height.
 * 3. If either dimension is less than the minimum target size (48px):
 *    a. Set `minWidth` and `minHeight` to the minimum size.
 *    b. Apply a standard padding variable to increase the visible size.
 *
 * @param {HTMLElement} element - Button or element to adjust.
 * @returns {void}
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
 * This function performs lightweight, non-destructive adjustments intended
 * to improve touch targets and text contrast for cards and controls.
 *
 * @pseudocode
 * 1. Select all `.scroll-button` elements and call `ensureTouchTargetSize` on each.
 * 2. Update card text color to ensure contrast against backgrounds.
 *
 * @param {HTMLElement} wrapper - Carousel wrapper element.
 * @returns {void}
 */
export function applyAccessibilityImprovements(wrapper) {
  const buttons = wrapper.querySelectorAll(".scroll-button");
  buttons.forEach((button) => ensureTouchTargetSize(button));
  const cards = wrapper.querySelectorAll(".judoka-card");
  cards.forEach((card) => {
    card.style.color = "var(--color-text-inverted)";
  });
}
export { ensureTouchTargetSize };

/**
 * Initialize carousel accessibility and interaction helpers.
 *
 * Ensures a unified controller exists and wires up focus, accessibility and
 * lazy-loading helpers for the provided carousel DOM elements.
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
 * @returns {void}
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
