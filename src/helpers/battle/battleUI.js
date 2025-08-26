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

import { onFrame as scheduleFrame, cancel as cancelFrame } from "../../utils/scheduler.js";

/**
 * Query all stat buttons.
 *
 * @returns {NodeListOf<HTMLButtonElement>} Node list of stat buttons.
 */
export function getStatButtons() {
  if (typeof document?.querySelectorAll !== "function") {
    return [];
  }
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
 * 5. In the next frame via the shared scheduler re-enable, clear styles, and blur.
 */
export function resetStatButtons(
  scheduler = {
    onFrame: scheduleFrame,
    cancel: cancelFrame
  }
) {
  console.log("INFO: resetStatButtons called");
  const { onFrame, cancel } = scheduler;
  getStatButtons().forEach((btn) => {
    btn.classList.remove("selected");
    btn.style.removeProperty("background-color");
    btn.disabled = true;
    void btn.offsetWidth;
    let frameId = 0;
    frameId = onFrame(() => {
      btn.disabled = false;
      btn.style.backgroundColor = "";
      btn.blur();
      cancel(frameId);
    });
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
 * 5. If `message` is non-empty, reduce opacity to 0 over 2s using the shared scheduler.
 * 6. When complete, add the `fading` class and remove inline opacity.
 *
 * @param {string} message - Result text to show.
 */
let cancelFade;
export function showResult(
  message,
  scheduler = {
    onFrame: scheduleFrame,
    cancel: cancelFrame,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout
  }
) {
  const { onFrame, cancel, setTimeout, clearTimeout } = scheduler;
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

  let frameId = 0;
  frameId = onFrame(() => {
    el.style.opacity = 0;
    cancel(frameId);
  });

  const timeoutId = setTimeout(() => {
    el.classList.add("fading");
    el.style.removeProperty("opacity");
    cancelFade = undefined;
  }, 2000);

  function cancelFadeFn() {
    cancel(frameId);
    clearTimeout(timeoutId);
    el.classList.remove("fading");
    el.style.removeProperty("opacity");
    cancelFade = undefined;
  }

  cancelFade = cancelFadeFn;
}
