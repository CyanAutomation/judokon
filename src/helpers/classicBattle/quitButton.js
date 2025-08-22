/**
 * Attach the Classic Battle Quit button listener.
 *
 * @pseudocode
 * 1. Locate `#quit-match-button` and exit if missing.
 * 2. Add a click handler that dynamically imports `quitMatch`.
 * 3. Invoke `quitMatch` with the provided store and button and mark the home link ready.
 *
 * @param {ReturnType<import('./roundManager.js').createBattleStore>} store - Battle state store.
 * @returns {void}
 */
export function initQuitButton(store) {
  const quitBtn = document.getElementById("quit-match-button");
  if (!quitBtn) return;
  quitBtn.addEventListener("click", async () => {
    const { quitMatch } = await import("./quitModal.js");
    quitMatch(store, quitBtn);
    window.homeLinkReady = true;
  });
}
