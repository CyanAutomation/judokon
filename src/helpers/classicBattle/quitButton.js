/**
 * Attach the Classic Battle Quit button listener.
 *
 * @pseudocode
 * 1. Locate `#quit-match-button` and exit if missing.
 * 2. Add a click handler that obtains `quitMatch` from deps or via dynamic import.
 * 3. Invoke `quitMatch` with the provided store and button.
 *
 * @param {ReturnType<import('./roundManager.js').createBattleStore>} store - Battle state store.
 * @param {{quitMatch?: typeof import('./quitModal.js').quitMatch}} [deps]
 * @returns {void}
 */
export function initQuitButton(store, { quitMatch: injectedQuitMatch } = {}) {
  const quitBtn = document.getElementById("quit-match-button");
  if (!quitBtn) return;
  quitBtn.addEventListener("click", async () => {
    const quitMatch = injectedQuitMatch ?? (await import("./quitModal.js")).quitMatch;
    quitMatch(store, quitBtn);
  });
}
