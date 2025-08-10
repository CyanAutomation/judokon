/**
 * Page wrapper for Classic Battle mode.
 *
 * @pseudocode
 * 1. Import battle helpers and DOM ready utility.
 * 2. Create a shared `battleStore` and expose it on `window`.
 * 3. Define `enableStatButtons` to toggle disabled state on all stat buttons.
 * 4. Define `startRoundWrapper` that:
 *    a. Disables stat buttons.
 *    b. Calls `startRound` from `classicBattle.js`.
 *    c. Waits for the Mystery card to render using `waitForComputerCard` then
 *       re-enables stat buttons.
 * 5. Define `setupClassicBattlePage` to:
 *    a. Load feature flags and set `data-*` attributes on `#battle-area`.
 *    b. Attach click and keyboard listeners on stat buttons that call
 *       `handleStatSelection` and display a snackbar with the chosen stat.
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
import { createBattleStore, startRound } from "./classicBattle/roundManager.js";
import { handleStatSelection } from "./classicBattle/selectionHandler.js";
import { onDomReady } from "./domReady.js";
import { waitForComputerCard } from "./battleJudokaPage.js";
import { initTooltips } from "./tooltip.js";
import { setTestMode } from "./testModeUtils.js";
import { toggleViewportSimulation } from "./viewportDebug.js";
import { loadStatNames } from "./stats.js";
import { STATS } from "./battleEngineFacade.js";
import { toggleInspectorPanels } from "./cardUtils.js";
import { showSnackbar } from "./showSnackbar.js";
import {
  initClassicBattleOrchestrator,
  dispatchBattleEvent
} from "./classicBattle/orchestrator.js";
import { skipCurrentPhase, onNextButtonClick } from "./classicBattle/timerService.js";
import { isEnabled, featureFlagsEmitter } from "./featureFlags.js";

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
async function startRoundWrapper() {
  enableStatButtons(false);
  await startRound(battleStore);
  await waitForComputerCard();
  enableStatButtons(true);
}

function setupNextButton() {
  const btn = document.getElementById("next-button");
  if (!btn) return;
  btn.addEventListener("click", onNextButtonClick);
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
  setupNextButton();

  toggleInspectorPanels(isEnabled("enableCardInspector"));
  wireStatButtons(statButtons);

  const battleArea = document.getElementById("battle-area");
  updateBattleAreaDataset(battleArea);

  toggleViewportSimulation(isEnabled("viewportSimulation"));
  setTestMode(isEnabled("enableTestMode"));

  const banner = document.getElementById("test-mode-banner");
  if (banner) banner.classList.toggle("hidden", !isEnabled("enableTestMode"));
  applyFeatureFlagListeners(battleArea, banner);

  initDebugPanel();

  window.startRoundOverride = () => startRoundWrapper();
  await initClassicBattleOrchestrator(battleStore, startRoundWrapper);
  await initTooltips();
  watchBattleOrientation();
  maybeShowStatHint();
}

function wireStatButtons(statButtons) {
  statButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!btn.disabled) {
        enableStatButtons(false);
        btn.classList.add("selected");
        showSnackbar(`You Picked: ${btn.textContent}`);
        // Inform state machine that the player acted
        dispatchBattleEvent("statSelected");
        handleStatSelection(battleStore, btn.dataset.stat);
      }
    });
    btn.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !btn.disabled) {
        e.preventDefault();
        enableStatButtons(false);
        btn.classList.add("selected");
        showSnackbar(`You Picked: ${btn.textContent}`);
        dispatchBattleEvent("statSelected");
        handleStatSelection(battleStore, btn.dataset.stat);
      }
    });
  });
}

function updateBattleAreaDataset(battleArea) {
  if (!battleArea) return;
  battleArea.dataset.mode = "classic";
  battleArea.dataset.randomStat = String(isEnabled("randomStatMode"));
  battleArea.dataset.testMode = String(isEnabled("enableTestMode"));
}

function applyFeatureFlagListeners(battleArea, banner) {
  featureFlagsEmitter.addEventListener("change", () => {
    if (battleArea) battleArea.dataset.testMode = String(isEnabled("enableTestMode"));
    if (banner) banner.classList.toggle("hidden", !isEnabled("enableTestMode"));
    setTestMode(isEnabled("enableTestMode"));
    toggleInspectorPanels(isEnabled("enableCardInspector"));
    // React to additional flags in real-time
    toggleViewportSimulation(isEnabled("viewportSimulation"));
    setDebugPanelEnabled(isEnabled("battleDebugPanel"));
  });
}

function initDebugPanel() {
  const debugPanel = document.getElementById("debug-panel");
  if (!debugPanel) return;
  const computerSlot = document.getElementById("computer-card");
  if (isEnabled("battleDebugPanel") && computerSlot) {
    computerSlot.prepend(debugPanel);
    debugPanel.classList.remove("hidden");
  } else {
    debugPanel.remove();
  }
}

// Ensure a debug panel exists and is attached/visible when enabled; remove when disabled
function setDebugPanelEnabled(enabled) {
  const computerSlot = document.getElementById("computer-card");
  let panel = document.getElementById("debug-panel");
  if (enabled) {
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "debug-panel";
      panel.className = "debug-panel";
      const pre = document.createElement("pre");
      pre.id = "debug-output";
      pre.setAttribute("role", "status");
      pre.setAttribute("aria-live", "polite");
      panel.appendChild(pre);
    }
    panel.classList.remove("hidden");
    if (computerSlot && panel.parentElement !== computerSlot) {
      computerSlot.prepend(panel);
    }
  } else if (panel) {
    panel.classList.add("hidden");
    panel.remove();
  }
}

function maybeShowStatHint() {
  try {
    if (typeof localStorage === "undefined") return;
    const hintShown = localStorage.getItem("statHintShown");
    if (hintShown) return;
    const help = document.getElementById("stat-help");
    help?.dispatchEvent(new Event("mouseenter"));
    setTimeout(() => {
      help?.dispatchEvent(new Event("mouseleave"));
    }, 3000);
    localStorage.setItem("statHintShown", "true");
  } catch {
    // ignore localStorage errors
  }
}

onDomReady(setupClassicBattlePage);
