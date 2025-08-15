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
 * 2. Pass the header to `initScoreboard()` so the module can query its children.
 */
function setupScoreboard() {
  const header = document.querySelector("header");
  if (!header) return;
  initScoreboard(header);
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
