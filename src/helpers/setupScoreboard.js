import {
  initScoreboard,
  showMessage,
  updateScore,
  startCountdown,
  clearMessage,
  showTemporaryMessage,
  clearTimer,
  showAutoSelect,
  updateRoundCounter,
  clearRoundCounter
} from "../components/Scoreboard.js";

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
