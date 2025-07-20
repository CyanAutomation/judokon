import {
  createInfoBar,
  initInfoBar,
  showMessage,
  updateScore,
  startCountdown
} from "../components/InfoBar.js";
import { onDomReady } from "./domReady.js";

/**
 * Insert the battle info bar after the page header if not already present.
 *
 * @pseudocode
 * 1. Locate the `<header>` element.
 * 2. If a `.battle-info-bar` element does not exist:
 *    a. Create one with `createInfoBar()`.
 *    b. Insert it immediately after the header.
 */
function setupBattleInfoBar() {
  const header = document.querySelector("header");
  if (!header) return;
  const existing = document.querySelector(".battle-info-bar");
  if (existing) {
    initInfoBar(existing);
  } else {
    const bar = createInfoBar();
    header.insertAdjacentElement("afterend", bar);
    initInfoBar(bar);
  }
}

onDomReady(setupBattleInfoBar);

export { showMessage, updateScore, startCountdown };
