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
import { realScheduler } from "./scheduler.js";

/**
 * Locate the page header and initialize scoreboard element references.
 *
 * @pseudocode
 * 1. Locate the `<header>` element.
 * 2. Pass the header and timer controls to `initScoreboard()` so the module can query its children.
 *
 * @param {object} controls - Timer control callbacks.
 * @param {object} [scheduler=realScheduler] - Timer scheduler.
 */
function setupScoreboard(controls, scheduler = realScheduler) {
  const header = document.querySelector("header");
  const withScheduler = { ...controls, scheduler };
  if (!header) {
    initScoreboard(null, withScheduler);
    return;
  }
  initScoreboard(header, withScheduler);
}
export {
  setupScoreboard,
  showMessage,
  updateScore,
  clearMessage,
  showTemporaryMessage,
  clearTimer,
  showAutoSelect,
  updateRoundCounter,
  clearRoundCounter
};
