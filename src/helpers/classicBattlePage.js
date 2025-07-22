/**
 * Page wrapper for Classic Battle mode.
 *
 * @pseudocode
 * 1. Import battle helpers and DOM ready utility.
 * 2. Define `enableStatButtons` to toggle disabled state on all stat buttons.
 * 3. Define `startRoundWrapper` that:
 *    a. Disables stat buttons.
 *    b. Calls `startRound` from `classicBattle.js`.
 *    c. Waits for the Mystery card to render using `waitForComputerCard`.
 *    d. Enables stat buttons.
 * 4. Define `setupClassicBattlePage` to:
 *    a. Attach click and keyboard listeners on stat buttons that call
 *       `handleStatSelection`.
 *    b. Set `window.startRoundOverride` to `startRoundWrapper` so the battle
 *       module uses it for subsequent rounds.
 *    c. Invoke `startRoundWrapper` to begin the match.
 * 5. Execute `setupClassicBattlePage` with `onDomReady`.
 */
import { startRound as classicStartRound, handleStatSelection } from "./classicBattle.js";
import { onDomReady } from "./domReady.js";
import { waitForComputerCard } from "./battleJudokaPage.js";

function enableStatButtons(enable = true) {
  document.querySelectorAll("#stat-buttons button").forEach((btn) => {
    btn.disabled = !enable;
    btn.tabIndex = enable ? 0 : -1;
    btn.classList.toggle("disabled", !enable);
  });
}

async function startRoundWrapper() {
  enableStatButtons(false);
  await classicStartRound();
  await waitForComputerCard();
  enableStatButtons(true);
}

export function setupClassicBattlePage() {
  const statButtons = document.querySelectorAll("#stat-buttons button");
  statButtons.forEach((btn) => {
    btn.style.minWidth = "44px";
    btn.style.minHeight = "44px";
    btn.addEventListener("click", () => {
      if (!btn.disabled) {
        enableStatButtons(false);
        btn.classList.add("selected");
        handleStatSelection(btn.dataset.stat);
      }
    });
    btn.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !btn.disabled) {
        e.preventDefault();
        enableStatButtons(false);
        btn.classList.add("selected");
        handleStatSelection(btn.dataset.stat);
      }
    });
  });

  window.startRoundOverride = startRoundWrapper;
  startRoundWrapper();
}

onDomReady(setupClassicBattlePage);
