import { createBattleStore, quitMatch } from "./classicBattle.js";

/**
 * Attach quit confirmation to the header logo in Classic Battle.
 *
 * @pseudocode
 * 1. Select the `[data-testid="home-link"]` element.
 * 2. If found, listen for click events.
 * 3. On click, prevent default navigation and call `quitMatch()`.
 */
const store = createBattleStore();

export function setupClassicBattleHomeLink() {
  const homeLink = document.querySelector('[data-testid="home-link"]');
  if (homeLink) {
    homeLink.addEventListener("click", (e) => {
      e.preventDefault();
      quitMatch(store);
    });
  }
}

setupClassicBattleHomeLink();
