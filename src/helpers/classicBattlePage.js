/**
 * Page wrapper for Classic Battle mode.
 *
 * @pseudocode
 * 1. Import battle helpers, settings loader and DOM ready utility.
 * 2. Create a shared `battleStore` and expose it on `window`.
 * 3. Define `enableStatButtons` to toggle disabled state on all stat buttons.
 * 4. Define `startRoundWrapper` that:
 *    a. Disables stat buttons.
 *    b. Calls `startRound` from `classicBattle.js`.
 *    c. Waits for the Mystery card to render using `waitForComputerCard`.
 *    d. In simulated opponent mode, select a stat via `simulateOpponentStat`
 *       and await `handleStatSelection`; otherwise re-enable stat buttons.
 * 5. Define `setupClassicBattlePage` to:
 *    a. Load feature flags and set `data-*` attributes on `#battle-area`.
 *    b. Attach click and keyboard listeners on stat buttons that call
 *       `handleStatSelection` and display a snackbar with the chosen stat when
 *       not in simulated opponent mode.
 *    c. Set `window.startRoundOverride` to `startRoundWrapper` so the battle
 *       module uses it for subsequent rounds.
 *    d. Toggle the debug panel and viewport simulation flags.
 *    e. Show a round selection modal that sets points-to-win and starts the first round.
 *    f. Initialize tooltips and show the stat help tooltip once for new users.
 *    g. Watch for orientation changes and update the battle header's
 *       `data-orientation` attribute.
 *    h. Listen for `storage` events and update the Test Mode banner and
 *       `data-test-mode` attribute when settings change.
 * 6. Execute `setupClassicBattlePage` with `onDomReady`.
 */
import {
  createBattleStore,
  startRound,
  handleStatSelection,
  simulateOpponentStat
} from "./classicBattle.js";
import { onDomReady } from "./domReady.js";
import { waitForComputerCard } from "./battleJudokaPage.js";
import { loadSettings } from "./settingsUtils.js";
import { initTooltips } from "./tooltip.js";
import { setTestMode } from "./testModeUtils.js";
import { toggleViewportSimulation } from "./viewportDebug.js";
import { loadStatNames } from "./stats.js";
import { STATS } from "./battleEngine.js";
import { toggleInspectorPanels } from "./cardUtils.js";
import { showSnackbar } from "./showSnackbar.js";
import { initRoundSelectModal } from "./classicBattle/roundSelectModal.js";
import { skipCurrentPhase } from "./classicBattle/timerService.js";

function enableStatButtons(enable = true) {
  document.querySelectorAll("#stat-buttons button").forEach((btn) => {
    btn.disabled = !enable;
    btn.tabIndex = enable ? 0 : -1;
    btn.classList.toggle("disabled", !enable);
  });
}

const battleStore = createBattleStore();
window.battleStore = battleStore;
window.skipBattlePhase = skipCurrentPhase;
export const getBattleStore = () => battleStore;
let simulatedOpponentMode = false;
let aiDifficulty = "easy";

async function startRoundWrapper() {
  enableStatButtons(false);
  await startRound(battleStore);
  await waitForComputerCard();
  if (simulatedOpponentMode) {
    const stat = simulateOpponentStat(aiDifficulty);
    await handleStatSelection(battleStore, stat);
  } else {
    enableStatButtons(true);
  }
}

async function applyStatLabels() {
  const names = await loadStatNames();
  names.forEach((n, i) => {
    const key = STATS[i];
    const btn = document.querySelector(`#stat-buttons button[data-stat="${key}"]`);
    if (btn) {
      btn.textContent = n.name;
      btn.setAttribute("aria-label", `Select ${n.name}`);
    }
  });
}

/**
 * Apply orientation data attribute on the battle header and watch for changes.
 *
 * @pseudocode
 * 1. Select the `.battle-header` element and exit if missing.
 * 2. Define `updateOrientation` that sets `data-orientation` to `portrait` or
 *    `landscape` based on `matchMedia`.
 * 3. Invoke `updateOrientation` immediately.
 * 4. Listen for `orientationchange` and `resize` events to call
 *    `updateOrientation` on each change.
 */
function watchBattleOrientation() {
  const header = document.querySelector(".battle-header");
  if (!header) return;

  const updateOrientation = () => {
    header.dataset.orientation = window.matchMedia("(orientation: portrait)").matches
      ? "portrait"
      : "landscape";
  };

  updateOrientation();
  window.addEventListener("orientationchange", updateOrientation);
  window.addEventListener("resize", updateOrientation);
}

export async function setupClassicBattlePage() {
  await applyStatLabels();
  const statButtons = document.querySelectorAll("#stat-buttons button");

  let settings;
  try {
    settings = await loadSettings();
  } catch {
    settings = { featureFlags: {} };
  }
  const inspectorEnabled = Boolean(settings.featureFlags?.enableCardInspector?.enabled);
  toggleInspectorPanels(inspectorEnabled);

  simulatedOpponentMode = Boolean(settings.featureFlags.simulatedOpponentMode?.enabled);
  const params = new URLSearchParams(window.location.search);
  const paramDifficulty = params.get("difficulty");
  if (["easy", "medium", "hard"].includes(paramDifficulty)) {
    aiDifficulty = paramDifficulty;
  } else if (typeof settings.aiDifficulty === "string") {
    aiDifficulty = settings.aiDifficulty;
  }
  if (simulatedOpponentMode) {
    enableStatButtons(false);
  } else {
    statButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!btn.disabled) {
          enableStatButtons(false);
          btn.classList.add("selected");
          showSnackbar(`You Picked: ${btn.textContent}`);
          handleStatSelection(battleStore, btn.dataset.stat);
        }
      });
      btn.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && !btn.disabled) {
          e.preventDefault();
          enableStatButtons(false);
          btn.classList.add("selected");
          showSnackbar(`You Picked: ${btn.textContent}`);
          handleStatSelection(battleStore, btn.dataset.stat);
        }
      });
    });
  }

  const battleArea = document.getElementById("battle-area");
  if (battleArea) {
    battleArea.dataset.mode = "classic";
    battleArea.dataset.randomStat = String(Boolean(settings.featureFlags.randomStatMode));
    battleArea.dataset.testMode = String(Boolean(settings.featureFlags.enableTestMode?.enabled));
    battleArea.dataset.simulatedOpponent = String(simulatedOpponentMode);
    battleArea.dataset.difficulty = aiDifficulty;
  }

  toggleViewportSimulation(Boolean(settings.featureFlags.viewportSimulation?.enabled));

  setTestMode(Boolean(settings.featureFlags.enableTestMode?.enabled));

  const banner = document.getElementById("test-mode-banner");
  if (banner) {
    banner.classList.toggle("hidden", !settings.featureFlags.enableTestMode?.enabled);
  }

  window.addEventListener("storage", (e) => {
    if (e.key === "settings" && e.newValue) {
      try {
        const s = JSON.parse(e.newValue);
        if (battleArea) {
          battleArea.dataset.testMode = String(Boolean(s.featureFlags?.enableTestMode?.enabled));
        }
        if (banner) {
          banner.classList.toggle("hidden", !s.featureFlags?.enableTestMode?.enabled);
        }
        setTestMode(Boolean(s.featureFlags?.enableTestMode?.enabled));
        toggleInspectorPanels(Boolean(s.featureFlags?.enableCardInspector?.enabled));
      } catch {}
    }
  });

  const debugPanel = document.getElementById("debug-panel");
  if (debugPanel) {
    const computerSlot = document.getElementById("computer-card");
    if (settings.featureFlags.battleDebugPanel?.enabled && computerSlot) {
      computerSlot.prepend(debugPanel);
      debugPanel.classList.remove("hidden");
    } else {
      debugPanel.remove();
    }
  }

  const skipBtn = document.getElementById("skip-phase-button");
  if (skipBtn) {
    skipBtn.addEventListener("click", () => skipCurrentPhase());
    window.addEventListener("skip-handler-change", (e) => {
      const { active } = e.detail || {};
      skipBtn.disabled = !active;
    });
  }

  window.startRoundOverride = () => startRoundWrapper();
  await initRoundSelectModal(() => startRoundWrapper());
  await initTooltips();
  watchBattleOrientation();

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
