/**
 * Utility for the typewriter effect on quote text.
 *
 * @pseudocode
 * 1. `shouldEnableTypewriter` calls `getSetting("typewriterEffect")` and
 *    returns that value.
 * 2. `runTypewriterEffect` types textContent of an element character by
 *    character at the given speed and restores the final HTML when done.
 */

import { getSetting } from "./settingsCache.js";
/**
 * Determine whether the typewriter effect should run.
 *
 * @returns {boolean} True when the effect is enabled.
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function shouldEnableTypewriter() {
  return Boolean(getSetting("typewriterEffect"));
}

/**
 * Animate text within an element as a typewriter effect.
 *
 * @param {HTMLElement} element - Element whose text should be animated.
 * @param {string} finalHtml - Final HTML to restore once typing finishes.
 * @param {number} [speed=200] - Delay in milliseconds between characters.
 * @returns {void}
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function runTypewriterEffect(element, finalHtml, speed = 200) {
  if (!element) return;
  const text = element.textContent;
  element.textContent = "";
  let i = 0;
  let acc = 0;
  let last = 0;
  let frameId = 0;
  const step = (ts) => {
    if (!element.isConnected) {
      cancelAnimationFrame(frameId);
      return;
    }
    if (!last) last = ts;
    acc += ts - last;
    last = ts;
    while (acc >= speed && i < text.length) {
      element.textContent += text.charAt(i);
      i += 1;
      acc -= speed;
    }
    if (i < text.length) {
      frameId = requestAnimationFrame(step);
    } else {
      element.innerHTML = finalHtml;
      cancelAnimationFrame(frameId);
    }
  };
  frameId = requestAnimationFrame(step);
}
