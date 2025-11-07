import { quitMatch as defaultQuitMatch } from "./quitModal.js";

/**
 * Attach the Classic Battle Quit button listener.
 *
 * @pseudocode
 * 1. Locate `#quit-button` and fall back to `#quit-match-button`; exit if neither exists.
 * 2. Add a click handler that obtains `quitMatch` from deps or the statically imported helper.
 * 3. Invoke `quitMatch` with the provided store and whichever button is present.
 *
 * @param {ReturnType<import('./roundManager.js').createBattleStore>} store - Battle state store.
 * @param {{quitMatch?: typeof import('./quitModal.js').quitMatch}} [deps]
 * @returns {void}
 */
export function initQuitButton(store, { quitMatch: injectedQuitMatch } = {}) {
  const quitBtn =
    document.getElementById("quit-button") ?? document.getElementById("quit-match-button");
  if (!quitBtn) return;
  quitBtn.addEventListener("click", () => {
    const quitMatch = injectedQuitMatch ?? defaultQuitMatch;
    quitMatch(store, quitBtn);
  });
}
