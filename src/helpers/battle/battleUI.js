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
 * 4. Force reflow so Safari clears the overlay.
 * 5. In the next animation frame re-enable, clear styles, and blur.
 */
export function resetStatButtons() {
  getStatButtons().forEach((btn) => {
    btn.classList.remove("selected");
    btn.style.removeProperty("background-color");
    btn.disabled = true;
    void btn.offsetWidth;
    const enable = () => {
      btn.disabled = false;
      btn.style.backgroundColor = "";
      btn.blur();
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(enable);
    } else {
      setTimeout(enable, 0);
    }
    // Fallback to ensure re-enable even if RAF is throttled under fake timers
    setTimeout(() => {
      if (btn.disabled) enable();
    }, 0);
  });
}

/**
 * Display the round result message and fade it out after 2s.
 *
 * @pseudocode
 * 1. Get the round message element using `getRoundMessageEl`.
 * 2. Exit early if the element is missing.
 * 3. Cancel any in-progress fade and clear styles.
 * 4. Add `fade-transition`, set the text content, and ensure it's visible.
 * 5. If `message` is non-empty, reduce opacity to 0 over 2s using `requestAnimationFrame`.
 * 6. When complete, add the `fading` class and remove inline opacity.
 *
 * @param {string} message - Result text to show.
 */
let cancelFade;
export function showResult(message) {
  const el = getRoundMessageEl();
  if (!el) return;

  if (cancelFade) {
    cancelFade();
  }

  el.classList.add("fade-transition");
  el.textContent = message;
  el.classList.remove("fading");
  el.style.removeProperty("opacity");

  if (!message) return;

  const start = performance.now();
  let frame;

  function step(now) {
    const progress = Math.min((now - start) / 2000, 1);
    el.style.opacity = 1 - progress;
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    } else {
      el.classList.add("fading");
      el.style.removeProperty("opacity");
      cancelFade = undefined;
    }
  }

  function cancel() {
    cancelAnimationFrame(frame);
    el.classList.remove("fading");
    el.style.removeProperty("opacity");
    cancelFade = undefined;
  }

  cancelFade = cancel;
  frame = requestAnimationFrame(step);
}
