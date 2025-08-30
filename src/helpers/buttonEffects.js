/**
 * Apply ripple and interaction effects to all buttons.
 *
 * @pseudocode
 * 1. Select all `button` and `.primary-button` elements in the document.
 * 2. For each element, attach a `mousedown` listener to create a ripple span.
 * 3. Position the ripple at the click coordinates and animate it.
 * 4. Remove the ripple once the animation finishes.
 */
import { shouldReduceMotionSync } from "./motionUtils.js";

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
export function setupButtonEffects() {
  const buttons = document.querySelectorAll("button, .primary-button");
  buttons.forEach((button) => {
    button.addEventListener("mousedown", (event) => {
      if (shouldReduceMotionSync()) return;
      if (button.querySelector("span.ripple")) return; // Prevent multiple ripples
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      ripple.style.left = `${event.offsetX}px`;
      ripple.style.top = `${event.offsetY}px`;
      button.appendChild(ripple);
      ripple.addEventListener("animationend", () => {
        ripple.remove();
      });
    });
  });
}
