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
import { onFrame, cancel } from "../utils/scheduler.js";
/**
 * Determine whether the typewriter effect should run.
 *
 * @pseudocode
 * 1. Read the `typewriterEffect` preference from the settings cache using `getSetting`.
 * 2. Coerce the returned value to a boolean and return it.
 *
 * @returns {boolean} True when the effect is enabled.
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
 *
 * @pseudocode
 * 1. If `element` is falsy, return immediately.
 * 2. Save the element's plain text and clear its content.
 * 3. Use requestAnimationFrame to append characters over time according to `speed`.
 * 4. Once complete, set `element.innerHTML` to `finalHtml` to restore markup.
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
      cancel(frameId);
      return;
    }
    if (!last) last = ts;
    acc += ts - last;
    last = ts;
    let iterations = 0;
    const MAX_PER_FRAME = 6;
    while (acc >= speed && i < text.length && iterations < MAX_PER_FRAME) {
      element.textContent += text.charAt(i);
      i += 1;
      acc -= speed;
      iterations++;
    }
    if (i >= text.length) {
      element.innerHTML = finalHtml;
      cancel(frameId);
    }
  };
  frameId = onFrame(step);
}
