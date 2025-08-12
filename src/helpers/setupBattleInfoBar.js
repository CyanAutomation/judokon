import {
  initInfoBar,
  showMessage,
  updateScore,
  startCountdown,
  clearMessage,
  showTemporaryMessage,
  clearTimer,
  showAutoSelect,
  updateRoundCounter,
  clearRoundCounter
} from "../components/InfoBar.js";

/**
 * Locate the page header and initialize info bar element references.
 *
 * @pseudocode
 * 1. Locate the `<header>` element.
 * 2. Pass the header to `initInfoBar()` so the module can query its children.
 */
function setupBattleInfoBar() {
  const header = document.querySelector("header");
  if (!header) return;
  initInfoBar(header);
}
export {
  setupBattleInfoBar,
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
