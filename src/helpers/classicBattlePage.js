/**
 * Page wrapper for Classic Battle mode.
 *
 * @pseudocode
 * 1. Import battle helpers, settings loader and DOM ready utility.
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
 *    c. Load feature flags, set `data-*` attributes on `#battle-area`, and
 *       toggle the debug panel based on the `battleDebugPanel` flag.
 *    d. Toggle the `.simulate-viewport` class based on the viewport flag.
 *    e. Invoke `startRoundWrapper` to begin the match.
 *    f. Initialize tooltips and show the stat help tooltip once for new users.
 * 5. Execute `setupClassicBattlePage` with `onDomReady`.
 */
import { startRound as classicStartRound, handleStatSelection } from "./classicBattle.js";
import { onDomReady } from "./domReady.js";
import { waitForComputerCard } from "./battleJudokaPage.js";
import { loadSettings } from "./settingsUtils.js";
import { initTooltips } from "./tooltip.js";
import { setTestMode } from "./testModeUtils.js";
import { toggleViewportSimulation } from "./viewportDebug.js";

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

function onStatSelect(stat) {
  handleStatSelection(stat);
}

export async function setupClassicBattlePage() {
  const statButtons = document.querySelectorAll("#stat-buttons button");
  statButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!btn.disabled) {
        enableStatButtons(false);
        btn.classList.add("selected");
        onStatSelect(btn.dataset.stat);
      }
    });
    btn.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !btn.disabled) {
        e.preventDefault();
        enableStatButtons(false);
        btn.classList.add("selected");
        onStatSelect(btn.dataset.stat);
      }
    });
  });

  let settings;
  try {
    settings = await loadSettings();
  } catch {
    settings = { featureFlags: {} };
  }

  const battleArea = document.getElementById("battle-area");
  if (battleArea) {
    battleArea.dataset.mode = "classic";
    battleArea.dataset.randomStat = String(Boolean(settings.featureFlags.randomStatMode));
    battleArea.dataset.testMode = String(Boolean(settings.featureFlags.enableTestMode?.enabled));
  }

  toggleViewportSimulation(Boolean(settings.featureFlags.viewportSimulation?.enabled));

  setTestMode(Boolean(settings.featureFlags.enableTestMode?.enabled));

  const banner = document.getElementById("test-mode-banner");
  if (banner) {
    banner.classList.toggle("hidden", !settings.featureFlags.enableTestMode?.enabled);
  }

  const debugPanel = document.getElementById("debug-panel");
  if (debugPanel) {
    if (settings.featureFlags.battleDebugPanel?.enabled) {
      debugPanel.classList.remove("hidden");
    } else {
      debugPanel.remove();
    }
  }

  window.startRoundOverride = startRoundWrapper;
  startRoundWrapper();
  await initTooltips();

  try {
    if (typeof localStorage !== "undefined") {
      const hintShown = localStorage.getItem("statHintShown");
      if (!hintShown) {
        const help = document.getElementById("stat-help");
        help?.dispatchEvent(new Event("mouseenter"));
        setTimeout(() => {
          help?.dispatchEvent(new Event("mouseleave"));
        }, 3000);
        localStorage.setItem("statHintShown", "true");
      }
    }
  } catch {
    // ignore localStorage errors
  }
}

onDomReady(setupClassicBattlePage);
