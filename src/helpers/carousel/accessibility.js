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
    element.style.padding = "10px";
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
