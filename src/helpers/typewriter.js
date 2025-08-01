/**
 * Utility for the typewriter effect on quote text.
 *
 * @pseudocode
 * 1. `shouldEnableTypewriter` reads the `settings` item from `localStorage`.
 *    - If `typewriterEffect` is `false`, return `false`.
 *    - Otherwise return `true`.
 * 2. `runTypewriterEffect` types textContent of an element character by
 *    character at the given speed and restores the final HTML when done.
 */

/**
 * Determine whether the typewriter effect should run.
 *
 * @returns {boolean} True when the effect is enabled.
 */
export function shouldEnableTypewriter() {
  try {
    const raw = localStorage.getItem("settings");
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.typewriterEffect === false) {
        return false;
      }
    }
  } catch {
    // ignore
  }
  return true;
}

/**
 * Animate text within an element as a typewriter effect.
 *
 * @param {HTMLElement} element - Element whose text should be animated.
 * @param {string} finalHtml - Final HTML to restore once typing finishes.
 * @param {number} [speed=200] - Delay in milliseconds between characters.
 * @returns {void}
 */
export function runTypewriterEffect(element, finalHtml, speed = 200) {
  if (!element) return;
  const text = element.textContent;
  element.textContent = "";
  let i = 0;
  (function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i += 1;
      setTimeout(type, speed);
    } else {
      element.innerHTML = finalHtml;
    }
  })();
}
