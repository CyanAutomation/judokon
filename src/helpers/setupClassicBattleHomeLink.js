import { onDomReady } from "./domReady.js";
import { createBattleStore, quitMatch } from "./classicBattle.js";

/**
 * Attach quit confirmation to the header logo in Classic Battle.
 *
 * @pseudocode
 * 1. When the DOM is ready, create the battle store.
 * 2. Select the `[data-testid="home-link"]` element.
 * 3. If found, attach a click listener that prevents navigation and calls `quitMatch()` with the link as trigger.
 * 4. After binding, set `window.homeLinkReady = true` for tests.
 */
export function setupClassicBattleHomeLink() {
  const store = createBattleStore();
  const homeLink = document.querySelector('[data-testid="home-link"]');
  if (homeLink) {
    homeLink.addEventListener("click", (e) => {
      e.preventDefault();
      quitMatch(store, homeLink);
    });
    window.homeLinkReady = true;
  }
}

onDomReady(setupClassicBattleHomeLink);
