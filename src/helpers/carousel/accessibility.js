import { setupFocusHandlers } from "./focus.js";
import { setupKeyboardNavigation, setupSwipeNavigation } from "./navigation.js";
import { setupLazyPortraits } from "../lazyPortrait.js";

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
 * @pseudocode
 * 1. Setup focus handlers for cards.
 * 2. Enable keyboard and swipe navigation.
 * 3. Apply accessibility improvements and lazy portrait loading.
 *
 * @param {HTMLElement} container - Carousel container element.
 * @param {HTMLElement} wrapper - Carousel wrapper element.
 */
export function initAccessibility(container, wrapper) {
  setupFocusHandlers(container);
  setupKeyboardNavigation(container);
  setupSwipeNavigation(container);
  applyAccessibilityImprovements(wrapper);
  setupLazyPortraits(container);
}
