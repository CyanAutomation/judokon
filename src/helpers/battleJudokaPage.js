/**
 * Setup logic for the Battle Judoka page.
 *
 * @pseudocode
 * 1. Import battle engine functions for round, stat selection, timer, and quitting.
 * 2. Define `setupBattleJudokaPage` to:
 *    a. Attach click and keyboard listeners to each stat button for accessibility.
 *    b. Start the stat selection timer on round start; update UI with remaining time.
 *    c. If timer expires, auto-select a random enabled stat and trigger selection.
 *    d. Disable stat buttons after selection or auto-selection.
 *    e. Attach a click listener to the home logo that calls `quitMatch` and navigates to the home screen on confirmation.
 *    f. Before each round, disable stat buttons and wait for the computer card to render.
 *    g. Invoke `startRound` to begin the match.
 * 3. Use `onDomReady` to run `setupBattleJudokaPage` when the DOM is ready.
 * 4. Block stat selection until the Mystery Judoka card is fully rendered using `waitForComputerCard` (see PRD: Mystery Card).
 */
import {
  startRound,
  handleStatSelection as engineHandleStatSelection,
  quitMatch
} from "./battleEngine.js";
import { onDomReady } from "./domReady.js";

function enableStatButtons(enable = true) {
  document.querySelectorAll("#stat-buttons button").forEach((btn) => {
    btn.disabled = !enable;
    btn.tabIndex = enable ? 0 : -1;
    btn.classList.toggle("disabled", !enable);
  });
}

function getRandomEnabledStat() {
  const enabled = Array.from(document.querySelectorAll("#stat-buttons button:not(:disabled)"));
  if (enabled.length === 0) return null;
  const idx = Math.floor(Math.random() * enabled.length);
  return enabled[idx];
}

export function waitForComputerCard() {
  const container = document.getElementById("computer-card");
  if (!container) return Promise.resolve();
  if (container.querySelector(".judoka-card")) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (container.querySelector(".judoka-card")) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(container, { childList: true, subtree: true });
  });
}

export function setupBattleJudokaPage() {
  const statButtons = document.querySelectorAll("#stat-buttons button");
  const timerDisplay = document.getElementById("next-round-timer");
  let statSelected = false;

  function onStatSelect(stat, btn) {
    if (statSelected) return;
    statSelected = true;
    btn.classList.add("selected");
    enableStatButtons(false);
    // TODO: Get actual stat values from card data
    const playerVal = 0; // placeholder
    const computerVal = 0; // placeholder
    engineHandleStatSelection(playerVal, computerVal);
    timerDisplay.textContent = "";
  }

  statButtons.forEach((btn) => {
    btn.style.minWidth = "44px";
    btn.style.minHeight = "44px";
    btn.addEventListener("click", () => onStatSelect(btn.dataset.stat, btn));
    btn.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !btn.disabled) {
        e.preventDefault();
        onStatSelect(btn.dataset.stat, btn);
      }
    });
  });

  async function startStatSelectionPhase() {
    statSelected = false;
    enableStatButtons(false);
    await waitForComputerCard();
    enableStatButtons(true);
    timerDisplay.textContent = "Time left: 30s";
    startRound(
      (remaining) => {
        if (remaining > 0) {
          timerDisplay.textContent = `Time left: ${remaining}s`;
        } else {
          timerDisplay.textContent = "";
        }
      },
      () => {
        // Auto-select random stat if timer expires
        const autoBtn = getRandomEnabledStat();
        if (autoBtn) {
          autoBtn.focus();
          onStatSelect(autoBtn.dataset.stat, autoBtn);
          timerDisplay.textContent = "Auto-selected!";
        }
      },
      30
    );
  }

  const homeLink = document.querySelector("[data-testid='home-link']");
  if (homeLink) {
    homeLink.addEventListener("click", (e) => {
      if (!quitMatch()) {
        e.preventDefault();
      }
    });
  }

  // Start the first stat selection phase
  startStatSelectionPhase();
}

onDomReady(setupBattleJudokaPage);
