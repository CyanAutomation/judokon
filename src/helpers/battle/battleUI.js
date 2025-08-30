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
import { isEnabled } from "../featureFlags.js";

const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

/**
 * Query all stat buttons.
 *
 * @returns {NodeListOf<HTMLButtonElement>} Node list of stat buttons.
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
/**
 * Return the stat button elements used in the Classic Battle UI.
 *
 * @summary Query and return all stat buttons inside `#stat-buttons`.
 * @pseudocode
 * 1. If document.querySelectorAll is unavailable return an empty array.
 * 2. Otherwise return `document.querySelectorAll("#stat-buttons button")`.
 *
 * @returns {NodeListOf<HTMLButtonElement>|Array} Node list of stat buttons or
 * an empty array when the DOM API is unavailable.
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
/**
 * Return the DOM element used for displaying round messages.
 *
 * @summary Return the element with id `round-message` or `null` if not found.
 * @pseudocode
 * 1. Call `document.getElementById("round-message")` and return the result.
 *
 * @returns {HTMLElement|null} The round message element.
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
/**
 * Clear visual selection and temporarily disable stat buttons to remove touch highlights.
 *
 * @summary Remove `selected` classes, clear inline background styles, and briefly
 * disable buttons to force browser reflow before restoring interactive state.
 * @pseudocode
 * 1. Iterate buttons returned by `getStatButtons`.
 * 2. Remove `selected` class and `background-color` style, disable the button.
 * 3. Force reflow and schedule a frame to re-enable the button and blur it.
 *
 * @param {object} [scheduler] - Optional scheduler exposing `onFrame` and `cancel`.
 * @returns {void}
 */
export function resetStatButtons(
  scheduler = {
    onFrame: scheduleFrame,
    cancel: cancelFrame
  }
) {
  try {
    if (!IS_VITEST) console.log("INFO: resetStatButtons called");
  } catch {}
  const { onFrame, cancel } = scheduler;
  getStatButtons().forEach((btn) => {
    btn.classList.remove("selected");
    btn.style.removeProperty("background-color");
    btn.disabled = true;
    void btn.offsetWidth;
    let frameId = 0;
    if (isEnabled("enableTestMode")) {
      btn.disabled = false;
    } else {
      frameId = onFrame(() => {
        btn.disabled = false;
        btn.style.backgroundColor = "";
        btn.blur();
        cancel(frameId);
      });
    }
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
/**
 * Show a transient round result message and fade it out.
 *
 * @summary Display `message` in the round message element, then fade out after a delay.
 * @pseudocode
 * 1. Get the round message element using `getRoundMessageEl`.
 * 2. Exit early if the element is missing.
 * 3. Cancel any active fade, set classes and text, and schedule opacity transition.
 * 4. After the timeout, add `fading` and clear inline style.
 *
 * @param {string} message - Result text to show.
 * @param {object} [scheduler] - Optional scheduler with `onFrame`, `cancel`, `setTimeout`, `clearTimeout`.
 * @returns {void}
 */
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
