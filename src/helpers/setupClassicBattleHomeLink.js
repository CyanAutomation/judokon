import { onDomReady } from "./domReady.js";
import { quitMatch } from "./classicBattle/quitModal.js";
import { markBattlePartReady } from "./battleInit.js";

/**
 * Attach quit confirmation to the header logo in Classic Battle.
 *
 * @pseudocode
 * 1. When the DOM is ready, select the `[data-testid="home-link"]` element.
 * 2. If found, attach a click listener that:
 *    a. Prevents navigation.
 *    b. Calls `quitMatch()` with the shared store and link as trigger.
 * 3. Wait for `window.battleStore` to exist, then call `markBattlePartReady('home')`.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
export function setupClassicBattleHomeLink() {
  const homeLink = document.querySelector('[data-testid="home-link"]');
  if (homeLink) {
    homeLink.addEventListener("click", (e) => {
      e.preventDefault();
      quitMatch(window.battleStore, homeLink);
    });
    (function waitForStore() {
      if (window.battleStore) {
        markBattlePartReady("home");
      } else {
        setTimeout(waitForStore, 0);
      }
    })();
  }
}

onDomReady(setupClassicBattleHomeLink);
