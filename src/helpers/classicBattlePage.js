/**
 * Page wrapper for Classic Battle mode.
 *
 * @pseudocode
 * 1. Import battle helpers, info bar setup, and DOM ready utility.
 * 2. Create a shared `battleStore` and expose it on `window`.
 * 3. Define `initStatButtons(store)` which wires stat buttons and returns an
 *    enable/disable API.
 * 4. Define `startRoundWrapper` that:
 *    a. Disables stat buttons.
 *    b. Calls `startRound` from `classicBattle.js`.
 *    c. Waits for the Mystery card to render using `waitForComputerCard` then
 *       re-enables stat buttons.
 * 5. Define `setupClassicBattlePage` to:
 *    a. Start the shared scheduler.
 *    b. Initialize the battle info bar.
 *    c. Load feature flags, apply them to `#battle-area` and react to changes.
 *    d. Initialize stat buttons, attach listeners, and display a snackbar with
 *       the chosen stat.
 *    e. Set `window.startRoundOverride` to `startRoundWrapper` so the battle
 *       module uses it for subsequent rounds.
 *    f. Toggle the debug panel.
 *    g. Show a round selection modal that sets points-to-win and starts the first round.
 *    h. Initialize tooltips and show the stat help tooltip once for new users.
 *    i. Watch for orientation changes and update the battle header's
 *       `data-orientation` attribute.
 *    j. Listen for `storage` events and update the Test Mode banner and
 *       `data-test-mode` attribute when settings change.
 * 6. Execute `setupClassicBattlePage` with `onDomReady`.
 */
import { createBattleStore, startRound } from "./classicBattle/roundManager.js";
import { handleStatSelection } from "./classicBattle/selectionHandler.js";
import { onDomReady } from "./domReady.js";
import { setupBattleInfoBar } from "./setupBattleInfoBar.js";
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
import { onNextButtonClick } from "./classicBattle/timerService.js";
import { skipCurrentPhase } from "./classicBattle/skipHandler.js";
import { initFeatureFlags, isEnabled, featureFlagsEmitter } from "./featureFlags.js";
import {
  start as startScheduler,
  onFrame as scheduleFrame,
  cancel as cancelFrame
} from "../utils/scheduler.js";

const battleStore = createBattleStore();
window.battleStore = battleStore;
window.skipBattlePhase = skipCurrentPhase;
export const getBattleStore = () => battleStore;
let statButtonControls;
async function startRoundWrapper() {
  statButtonControls.disable();
  await startRound(battleStore);
  await waitForComputerCard();
  statButtonControls.enable();
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
 * 1. Define `getOrientation` to compute `portrait` or `landscape` using
 *    viewport size and `matchMedia`.
 * 2. Define `apply` that selects `.battle-header`, sets `data-orientation`
 *    using `getOrientation`, and returns `true` if the header exists.
 * 3. Run `apply` immediately; if it returns `false`, poll with
 *    `scheduler.onFrame` until `apply` succeeds, then cancel the polling task.
 * 4. Listen for `orientationchange` and `resize` events to update the header in
 *    real time.
 */
function watchBattleOrientation() {
  const getOrientation = () => {
    try {
      // Prefer viewport-based detection; fall back to matchMedia when available
      const portrait = window.innerHeight >= window.innerWidth;
      if (typeof window.matchMedia === "function") {
        const mm = window.matchMedia("(orientation: portrait)");
        // Use matchMedia result only when it agrees with viewport heuristic to avoid env quirks
        if (typeof mm.matches === "boolean" && mm.matches !== portrait) {
          // When there is disagreement, prefer viewport heuristic in headless tests
          return portrait ? "portrait" : "landscape";
        }
        return mm.matches ? "portrait" : "landscape";
      }
      return portrait ? "portrait" : "landscape";
    } catch {
      // Safe fallback
      return window.innerHeight >= window.innerWidth ? "portrait" : "landscape";
    }
  };

  const apply = () => {
    const header = document.querySelector(".battle-header");
    if (header) {
      header.dataset.orientation = getOrientation();
      return true;
    }
    return false;
  };

  // Apply immediately; if header not yet available, poll using the scheduler.
  if (!apply()) {
    let id;
    id = scheduleFrame(() => {
      if (apply()) cancelFrame(id);
    });
  }

  const onChange = () => {
    const header = document.querySelector(".battle-header");
    if (header) header.dataset.orientation = getOrientation();
  };
  window.addEventListener("orientationchange", onChange);
  window.addEventListener("resize", onChange);
}

export async function setupClassicBattlePage() {
  if (!(typeof process !== "undefined" && process.env.VITEST)) startScheduler();
  setupBattleInfoBar();
  // Apply orientation ASAP so tests observing the header don't block
  // behind async initialization (flags, data fetches, tooltips, etc.).
  watchBattleOrientation();
  await initFeatureFlags();
  setupNextButton();

  statButtonControls = initStatButtons(battleStore);

  const battleArea = document.getElementById("battle-area");
  const banner = document.getElementById("test-mode-banner");
  applyBattleFeatureFlags(battleArea, banner);

  initDebugPanel();

  window.startRoundOverride = () => startRoundWrapper();
  await initClassicBattleOrchestrator(battleStore, startRoundWrapper);
  // Non-critical UI enhancements can load after the orchestrator begins
  // to reduce time-to-first-round in tests.
  applyStatLabels().catch(() => {});
  await initTooltips();
  maybeShowStatHint();
}

function initStatButtons(store) {
  const statButtons = document.querySelectorAll("#stat-buttons button");

  function setEnabled(enable = true) {
    statButtons.forEach((btn) => {
      btn.disabled = !enable;
      btn.tabIndex = enable ? 0 : -1;
      btn.classList.toggle("disabled", !enable);
    });
  }

  statButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!btn.disabled) {
        setEnabled(false);
        btn.classList.add("selected");
        showSnackbar(`You Picked: ${btn.textContent}`);
        dispatchBattleEvent("statSelected");
        handleStatSelection(store, btn.dataset.stat);
      }
    });
    btn.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !btn.disabled) {
        e.preventDefault();
        setEnabled(false);
        btn.classList.add("selected");
        showSnackbar(`You Picked: ${btn.textContent}`);
        dispatchBattleEvent("statSelected");
        handleStatSelection(store, btn.dataset.stat);
      }
    });
  });

  return {
    enable: () => setEnabled(true),
    disable: () => setEnabled(false)
  };
}

function applyBattleFeatureFlags(battleArea, banner) {
  if (battleArea) {
    battleArea.dataset.mode = "classic";
    battleArea.dataset.testMode = String(isEnabled("enableTestMode"));
  }
  if (banner) banner.classList.toggle("hidden", !isEnabled("enableTestMode"));
  setTestMode(isEnabled("enableTestMode"));
  toggleInspectorPanels(isEnabled("enableCardInspector"));
  toggleViewportSimulation(isEnabled("viewportSimulation"));
  setDebugPanelEnabled(isEnabled("battleDebugPanel"));

  featureFlagsEmitter.addEventListener("change", () => {
    if (battleArea) battleArea.dataset.testMode = String(isEnabled("enableTestMode"));
    if (banner) banner.classList.toggle("hidden", !isEnabled("enableTestMode"));
    setTestMode(isEnabled("enableTestMode"));
    toggleInspectorPanels(isEnabled("enableCardInspector"));
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
