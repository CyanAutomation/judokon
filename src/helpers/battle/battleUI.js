/**
 * DOM helpers for Classic Battle UI.
 *
 * @pseudocode
 * Export functions:
 *  - `getStatButtons` -> return NodeList of stat buttons within `#stat-buttons`.
 *  - `getRoundMessageEl` -> return the element with id `round-message`.
 *  - `resetStatButtons` -> clear selected state and touch highlight from stat buttons.
 *  - `showResult` -> display result text and fade it out after a delay.
 */

/**
 * Query all stat buttons.
 *
 * @returns {NodeListOf<HTMLButtonElement>} Node list of stat buttons.
 */
export function getStatButtons() {
  return document.querySelectorAll("#stat-buttons button");
}

/**
 * Get the element used for round messages.
 *
 * @returns {HTMLElement|null} The round message element or null.
 */
export function getRoundMessageEl() {
  return document.getElementById("round-message");
}

/**
 * Remove highlight and focus from all stat buttons.
 *
 * @pseudocode
 * 1. Loop over buttons returned by `getStatButtons`.
 * 2. Remove the `selected` class and any inline background color.
 * 3. Disable the button to clear active/tap highlight.
 * 4. Force reflow and set `-webkit-tap-highlight-color` to transparent.
 * 5. In the next animation frame re-enable, clear styles, and blur.
 */
export function resetStatButtons() {
  getStatButtons().forEach((btn) => {
    btn.classList.remove("selected");
    btn.style.removeProperty("background-color");
    btn.disabled = true;
    void btn.offsetWidth;
    btn.style.setProperty("-webkit-tap-highlight-color", "transparent");
    requestAnimationFrame(() => {
      btn.disabled = false;
      btn.style.removeProperty("-webkit-tap-highlight-color");
      btn.style.backgroundColor = "";
      btn.blur();
    });
  });
}

/**
 * Display the round result message and fade it out after 2s.
 *
 * @pseudocode
 * 1. Get the round message element using `getRoundMessageEl`.
 * 2. Exit early if the element is missing.
 * 3. Add `fade-transition`, set the text content, and ensure it's visible.
 * 4. If `message` is non-empty, add the `fading` class after 2 seconds.
 *
 * @param {string} message - Result text to show.
 */
export function showResult(message) {
  const el = getRoundMessageEl();
  if (!el) return;
  el.classList.add("fade-transition");
  el.textContent = message;
  el.classList.remove("fading");
  if (message) {
    setTimeout(() => {
      el.classList.add("fading");
    }, 2000);
  }
}
