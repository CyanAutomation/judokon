import {
  initScoreboard,
  showMessage,
  updateScore,
  clearMessage,
  showTemporaryMessage,
  clearTimer,
  showAutoSelect,
  updateRoundCounter,
  clearRoundCounter
} from "../components/Scoreboard.js";
import { showSnackbar, updateSnackbar } from "./showSnackbar.js";

const realTimers = {
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id)
};

/**
 * Start a cooldown countdown updating the snackbar each second.
 *
 * @pseudocode
 * 1. Clear any existing timer text.
 * 2. Show `"Next round in: <n>s"` via `showSnackbar`.
 * 3. Every second update the snackbar text and decrement remaining time.
 * 4. When the countdown finishes, clear the timer and invoke `onFinish`.
 *
 * @param {number} seconds - Seconds to count down from.
 * @param {Function} [onFinish] - Optional callback when countdown ends.
 * @param {{setInterval: Function, clearInterval: Function}} [scheduler=realTimers]
 * - Timer utilities allowing tests to control time.
 */
function startCountdown(seconds, onFinish, scheduler = realTimers) {
  clearTimer();
  let remaining = Math.floor(seconds);
  if (remaining <= 0) {
    if (typeof onFinish === "function") onFinish();
    return;
  }
  showSnackbar(`Next round in: ${remaining}s`);
  const id = scheduler.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      scheduler.clearInterval(id);
      clearTimer();
      if (typeof onFinish === "function") onFinish();
    } else {
      const text = `Next round in: ${remaining}s`;
      if (typeof updateSnackbar === "function") {
        updateSnackbar(text);
      }
    }
  }, 1000);
}

/**
 * Locate the page header and initialize scoreboard element references.
 *
 * @pseudocode
 * 1. Locate the `<header>` element.
 * 2. Pass the header and timer controls to `initScoreboard()` so the module can query its children.
 *
 * @param {object} controls - Timer control callbacks.
 */
function setupScoreboard(controls) {
  const header = document.querySelector("header");
  if (!header) {
    initScoreboard(null, controls);
    return;
  }
  initScoreboard(header, controls);
}
export {
  setupScoreboard,
  showMessage,
  updateScore,
  startCountdown,
  clearMessage,
  showTemporaryMessage,
  clearTimer,
  showAutoSelect,
  updateRoundCounter,
  clearRoundCounter
};
