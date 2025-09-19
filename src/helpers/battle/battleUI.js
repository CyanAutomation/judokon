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

function scheduleImmediate(callback) {
  if (typeof globalThis?.requestAnimationFrame === "function") {
    const rafId = globalThis.requestAnimationFrame(() => {
      callback();
    });
    return () => {
      try {
        globalThis.cancelAnimationFrame?.(rafId);
      } catch {}
    };
  }
  if (typeof globalThis?.queueMicrotask === "function") {
    let cancelled = false;
    globalThis.queueMicrotask(() => {
      if (cancelled) return;
      callback();
    });
    return () => {
      cancelled = true;
    };
  }
  if (typeof globalThis?.Promise === "function") {
    let cancelled = false;
    globalThis.Promise.resolve()
      .then(() => {
        if (cancelled) return;
        callback();
      })
      .catch(() => {
        if (cancelled) return;
        callback();
      });
    return () => {
      cancelled = true;
    };
  }
  if (typeof globalThis?.setTimeout === "function") {
    const timeoutId = globalThis.setTimeout(() => {
      callback();
    }, 0);
    return () => {
      try {
        globalThis.clearTimeout?.(timeoutId);
      } catch {}
    };
  }
  try {
    if (!IS_VITEST) {
      console.warn(
        "resetStatButtons fallback executed synchronously; async scheduling unavailable"
      );
    }
  } catch {}
  callback();
  return () => {};
}

/**
 * Return the stat button elements used in the Classic Battle UI.
 *
 * @summary Query and return all stat buttons inside `#stat-buttons`.
 * @pseudocode
 * 1. If `document.querySelectorAll` is unavailable → return an empty array.
 * 2. Otherwise return `document.querySelectorAll('#stat-buttons button')`.
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
 * Return the DOM element used for displaying round messages.
 *
 * @summary Return the element with id `round-message` or `null` if not found.
 * @pseudocode
 * 1. Call `document.getElementById('round-message')` and return the result.
 *
 * @returns {HTMLElement|null} The round message element.
 */
export function getRoundMessageEl() {
  return document.getElementById("round-message");
}

/**
 * Clear visual selection and temporarily disable stat buttons to remove touch highlights.
 *
 * @summary Remove `selected` classes, clear inline background styles, and briefly
 * disable buttons to force browser reflow before restoring interactive state.
 * @pseudocode
 * 1. For each button in `getStatButtons()`:
 *    - Remove `selected` and inline `background-color`.
 *    - Set `disabled = true` and force reflow (`offsetWidth`).
 * 2. Use the scheduler to re-enable, clear styles, and blur on the next frame.
 * 3. In test mode, skip the delay and immediately re-enable.
 *
 * @param {object} [scheduler] - Optional scheduler with `onFrame` and `cancel`.
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
    const enableButton = () => {
      btn.disabled = false;
      btn.style.backgroundColor = "";
      btn.blur();
    };
    if (isEnabled("enableTestMode")) {
      enableButton();
      return;
    }
    // Guard against multiple invocations when both the scheduler callback and
    // the fallback race to re-enable the button.
    let didRun = false;
    const runEnableOnce = () => {
      if (didRun) return;
      didRun = true;
      enableButton();
    };
    let cancelFallback;
    const runAndCancelFallback = () => {
      if (typeof cancelFallback === "function") {
        try {
          cancelFallback();
        } catch {}
        cancelFallback = undefined;
      }
      runEnableOnce();
    };
    if (typeof onFrame !== "function") {
      runEnableOnce();
      return;
    }
    let frameId;
    try {
      frameId = onFrame(() => {
        runAndCancelFallback();
        if (typeof cancel === "function" && typeof frameId === "number" && !Number.isNaN(frameId)) {
          cancel(frameId);
        }
      });
    } catch {
      runEnableOnce();
      return;
    }
    if (typeof frameId !== "number" || Number.isNaN(frameId)) {
      runEnableOnce();
      return;
    }
    cancelFallback = scheduleImmediate(runEnableOnce);
  });
}

let cancelFade;

/**
 * Display the round result message and fade it out after 2s.
 *
 * @summary Show `message` in `#round-message`, start opacity transition, then clear.
 * @pseudocode
 * 1. Obtain `el = getRoundMessageEl()`; if missing, return.
 * 2. Cancel any previous fade; set classes, set `textContent`, ensure visible.
 * 3. If `message` is empty → return (no fade).
 * 4. On next frame, set `opacity: 0` and schedule a timeout to add `fading` and clear inline styles.
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
