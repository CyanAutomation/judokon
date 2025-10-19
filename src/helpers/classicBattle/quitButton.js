/**
 * Attach the Classic Battle Quit button listener.
 *
 * @pseudocode
 * 1. Locate `#quit-button` and fall back to `#quit-match-button`; exit if neither exists.
 * 2. Add a click handler that obtains `quitMatch` from deps or via dynamic import.
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
  quitBtn.addEventListener("click", async () => {
    const quitMatch =
      injectedQuitMatch ?? (await import("/src/helpers/classicBattle/quitModal.js")).quitMatch;
    quitMatch(store, quitBtn);
  });
}
