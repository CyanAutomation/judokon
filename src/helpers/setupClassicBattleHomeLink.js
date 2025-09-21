import { onDomReady } from "./domReady.js";
import { quitMatch } from "./classicBattle/quitModal.js";
import { markBattlePartReady } from "./battleInit.js";

/**
 * Attach a quit confirmation handler to the Classic Battle home link.
 *
 * @pseudocode
 * 1. When DOM is ready, query `[data-testid="home-link"]`.
 * 2. If the element exists, attach a click listener that prevents default
 *    navigation and calls `quitMatch(window.battleStore, link)`.
 * 3. Poll for `window.battleStore`; once available, call `markBattlePartReady('home')`.
 *
 * @returns {void}
 */
export function setupClassicBattleHomeLink() {
  const homeLinks = Array.from(document.querySelectorAll('[data-testid="home-link"]'));
  if (homeLinks.length === 0) return;

  homeLinks.forEach((link) => {
    if (link.dataset.homeLinkBound === "true") return;
    link.dataset.homeLinkBound = "true";
    link.addEventListener("click", (e) => {
      e.preventDefault();
      quitMatch(window.battleStore, link);
    });
  });

  (function waitForStore() {
    if (window.battleStore) {
      markBattlePartReady("home");
    } else {
      setTimeout(waitForStore, 0);
    }
  })();
}

onDomReady(setupClassicBattleHomeLink);
