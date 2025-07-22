/**
 * Setup logic for the Battle Judoka page.
 *
 * @pseudocode
 * 1. Import `startRound`, `handleStatSelection`, and `quitMatch` from
 *    `classicBattle.js`.
 * 2. Define `setupBattleJudokaPage` to:
 *    a. Attach a click listener to each stat button that highlights the button
 *       and calls `handleStatSelection` with the button's data attribute.
 *    b. Attach a click listener to the home logo that calls `quitMatch` and
 *       navigates to the home screen on confirmation.
 *    c. Disable all stat buttons and invoke `startRound`.
 *    d. Re-enable the buttons once the Mystery card is rendered.
 *    e. Override `startRound` for subsequent rounds to apply the same blocking.
 * 3. Use `onDomReady` to run `setupBattleJudokaPage` when the DOM is ready.
 */
import { startRound, handleStatSelection, quitMatch } from "./classicBattle.js";
import { onDomReady } from "./domReady.js";

function toggleStatButtons(disabled) {
  document.querySelectorAll("#stat-buttons button").forEach((btn) => {
    btn.disabled = disabled;
  });
}

async function startRoundWithBlocking() {
  toggleStatButtons(true);
  await startRound();
  toggleStatButtons(false);
}

export function setupBattleJudokaPage() {
  document.querySelectorAll("#stat-buttons button").forEach((btn) =>
    btn.addEventListener("click", () => {
      btn.classList.add("selected");
      handleStatSelection(btn.dataset.stat);
    })
  );

  const homeLink = document.querySelector("[data-testid='home-link']");
  if (homeLink) {
    homeLink.addEventListener("click", (e) => {
      if (!quitMatch()) {
        e.preventDefault();
      }
    });
  }

  window.startRoundOverride = startRoundWithBlocking;
  startRoundWithBlocking();
}

onDomReady(setupBattleJudokaPage);
