/**
 * Setup logic for the Battle Judoka page.
 *
 * @pseudocode
 * 1. Import `startRound`, `handleStatSelection`, and `quitMatch` from
 *    `classicBattle.js`.
 * 2. Define `setupBattleJudokaPage` to:
 *    a. Attach a click listener to each stat button that calls
 *       `handleStatSelection` with the button's data attribute.
 *    b. Attach a click listener to the quit button that calls `quitMatch`.
 *    c. Invoke `startRound` to begin the match.
 * 3. Use `onDomReady` to run `setupBattleJudokaPage` when the DOM is ready.
 */
import { startRound, handleStatSelection, quitMatch } from "./classicBattle.js";
import { onDomReady } from "./domReady.js";

export function setupBattleJudokaPage() {
  document
    .querySelectorAll("#stat-buttons button")
    .forEach((btn) => btn.addEventListener("click", () => handleStatSelection(btn.dataset.stat)));

  const quitBtn = document.getElementById("quit-btn");
  if (quitBtn) {
    quitBtn.addEventListener("click", quitMatch);
  }

  startRound();
}

onDomReady(setupBattleJudokaPage);
