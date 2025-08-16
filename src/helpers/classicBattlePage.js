/**
 * Page wrapper for Classic Battle mode.
 *
 * @pseudocode
 * 1. Import battle helpers, scoreboard setup, and DOM ready utility.
 * 2. Create a shared `battleStore` and expose it on `window`.
 * 3. Define `initStatButtons(store)` which wires stat buttons and returns an
 *    enable/disable API.
 * 4. Define `startRoundWrapper` that:
 *    a. Disables stat buttons.
 *    b. Calls `startRound` and waits for the Mystery card via
 *       `waitForComputerCard` with a timeout.
 *    c. Logs and surfaces an error, showing a retry modal on failure.
 *    d. Re-enables stat buttons in a `finally` block.
 * 5. Define `setupClassicBattlePage` to:
 *    a. Start the shared scheduler.
 *    b. Initialize the battle scoreboard.
 *    c. Load feature flags, apply them to `#battle-area` and react to changes.
 *    d. Initialize stat buttons, attach listeners, and display a snackbar with
 *       the chosen stat.
 *    e. Set `window.startRoundOverride` to `startRoundWrapper` so the battle
 *       module uses it for subsequent rounds.
 *    f. Toggle the debug panel.
 *    g. Initialize the battle state progress list, then let the orchestrator
 *       present the round selection modal to set points-to-win and start the
 *       first round.
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
import { setupScoreboard, showMessage } from "./setupScoreboard.js";
import { waitForComputerCard } from "./battleJudokaPage.js";
import { initTooltips } from "./tooltip.js";
import { setTestMode } from "./testModeUtils.js";
import { toggleViewportSimulation } from "./viewportDebug.js";
import { pauseTimer, resumeTimer } from "./battleEngineFacade.js";
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
import { initInterruptHandlers } from "./classicBattle/interruptHandlers.js";
import {
  start as startScheduler,
  stop as stopScheduler,
  onFrame as scheduleFrame,
  cancel as cancelFrame
} from "../utils/scheduler.js";
import { createModal } from "../components/Modal.js";
import { createButton } from "../components/Button.js";
import { initBattleStateProgress } from "./battleStateProgress.js";

const battleStore = createBattleStore();
window.battleStore = battleStore;
window.skipBattlePhase = skipCurrentPhase;
export const getBattleStore = () => battleStore;
let statButtonControls;
async function startRoundWrapper() {
  statButtonControls?.disable();
  try {
    await startRound(battleStore);
    await waitForComputerCard(5000);
  } catch (error) {
    console.error("Error starting round:", error);
    try {
      showMessage("Round start error. Please retry.");
      showRetryModal();
    } catch {}
  } finally {
    statButtonControls?.enable();
  }
}

/**
 * Show a modal with a retry button when round start fails.
 *
 * @pseudocode
 * 1. Create a modal dialog with an error message and a Retry button.
 * 2. When Retry is clicked, close the modal and call startRoundWrapper again.
 * 3. If modal is already open, do not create another.
 */
function showRetryModal() {
  if (document.getElementById("round-retry-modal")) return;
  const title = document.createElement("h2");
  title.textContent = "Round Start Error";
  const msg = document.createElement("p");
  msg.textContent = "Unable to start the round. Please check your connection or try again.";
  const retryBtn = createButton("Retry", { id: "retry-round-btn", className: "primary-button" });
  const actions = document.createElement("div");
  actions.className = "modal-actions";
  actions.appendChild(retryBtn);
  const frag = document.createDocumentFragment();
  frag.append(title, msg, actions);
  const modal = createModal(frag, { labelledBy: title });
  modal.element.id = "round-retry-modal";
  retryBtn.addEventListener("click", async () => {
    modal.close();
    await startRoundWrapper();
  });
  document.body.appendChild(modal.element);
  modal.open();
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
 * 4. Listen for `orientationchange` and `resize` events. Call `apply`
 *    immediately, then throttle further updates with `requestAnimationFrame`.
 *    If `apply` fails because the header is missing, poll with
 *    `scheduler.onFrame` until it appears.
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
      const next = getOrientation();
      if (header.dataset.orientation !== next) {
        header.dataset.orientation = next;
      }
      return true;
    }
    return false;
  };

  // Expose a testing hook to force-apply the current orientation.
  try {
    window.applyBattleOrientation = () => {
      try {
        apply();
      } catch {}
    };
  } catch {}

  // Apply immediately; if header not yet available, poll using the scheduler.
  let pollId;
  const pollIfMissing = () => {
    if (pollId) return;
    pollId = scheduleFrame(() => {
      if (apply()) {
        cancelFrame(pollId);
        pollId = 0;
      }
    });
  };
  if (!apply()) pollIfMissing();

  let rafId;
  const onChange = () => {
    if (!apply()) pollIfMissing();
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!apply()) pollIfMissing();
    });
  };

  window.addEventListener("orientationchange", onChange);
  window.addEventListener("resize", onChange);
}

function setBattleStateBadgeEnabled(enable) {
  let badge = document.getElementById("battle-state-badge");
  if (!enable) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    const headerRight =
      document.getElementById("scoreboard-right") ||
      document.querySelector(".battle-header .scoreboard-right");
    badge = document.createElement("p");
    badge.id = "battle-state-badge";
    badge.dataset.flag = "battleStateBadge";
    badge.setAttribute("data-tooltip-id", "settings.battleStateBadge");
    badge.setAttribute("aria-live", "polite");
    badge.setAttribute("aria-atomic", "true");
    if (headerRight) headerRight.appendChild(badge);
    else document.querySelector("header")?.appendChild(badge);
  }
  try {
    const current = typeof window !== "undefined" ? window.__classicBattleState : null;
    badge.textContent = current ? `State: ${current}` : "State: —";
  } catch {
    badge.textContent = "State: —";
  }
}

export async function setupClassicBattlePage() {
  if (!(typeof process !== "undefined" && process.env.VITEST)) {
    startScheduler();
    window.addEventListener("pagehide", stopScheduler, { once: true });
  }
  setupScoreboard();
  initInterruptHandlers(battleStore);
  // Apply orientation ASAP so tests observing the header don't block
  // behind async initialization (flags, data fetches, tooltips, etc.).
  watchBattleOrientation();
  await initFeatureFlags();
  // In Test Mode, reduce noisy UI to keep E2E runs stable
  try {
    if (isEnabled("enableTestMode")) {
      window.__disableSnackbars = true;
    }
  } catch {}
  setupNextButton();
  // Toggle a visible state badge for testing when enabled
  setBattleStateBadgeEnabled(isEnabled("battleStateBadge"));
  featureFlagsEmitter.addEventListener("change", () => {
    setBattleStateBadgeEnabled(isEnabled("battleStateBadge"));
  });

  statButtonControls = initStatButtons(battleStore);

  const battleArea = document.getElementById("battle-area");
  const banner = document.getElementById("test-mode-banner");
  applyBattleFeatureFlags(battleArea, banner);

  initDebugPanel();

  window.startRoundOverride = () => startRoundWrapper();
  initBattleStateProgress();
  await initClassicBattleOrchestrator(battleStore, startRoundWrapper);
  // Non-critical UI enhancements can load after the orchestrator begins
  applyStatLabels().catch(() => {});
  await initTooltips();
  maybeShowStatHint();

  // Expose small helpers for Playwright to freeze/resume header updates
  try {
    window.freezeBattleHeader = () => {
      try {
        pauseTimer();
        // Stop the shared scheduler to minimize UI churn during E2E screenshots
        try {
          stopScheduler();
        } catch {}
      } catch {}
    };
    window.resumeBattleHeader = () => {
      try {
        // Restart scheduler and resume timers
        try {
          startScheduler();
        } catch {}
        resumeTimer();
      } catch {}
    };
  } catch {}

  // Wire up Quit Match button to show confirmation modal
  const quitBtn = document.getElementById("quit-match-button");
  if (quitBtn) {
    quitBtn.addEventListener("click", async () => {
      // Show quit confirmation modal
      if (window.battleStore) {
        const { quitMatch } = await import("./classicBattle/quitModal.js");
        quitMatch(window.battleStore, quitBtn);
        window.homeLinkReady = true; // For Playwright test sync
      }
    });
  }
}

function initStatButtons(store) {
  const statButtons = document.querySelectorAll("#stat-buttons button");
  const statContainer = document.getElementById("stat-buttons");

  function setEnabled(enable = true) {
    statButtons.forEach((btn) => {
      btn.disabled = !enable;
      btn.tabIndex = enable ? 0 : -1;
      btn.classList.toggle("disabled", !enable);
    });
    if (statContainer) {
      statContainer.dataset.buttonsReady = String(enable);
    }
  }

  statButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!btn.disabled) {
        setEnabled(false);
        btn.classList.add("selected");
        showSnackbar(`You Picked: ${btn.textContent}`);
        await dispatchBattleEvent("statSelected");
        await handleStatSelection(store, btn.dataset.stat);
      }
    });
    btn.addEventListener("keydown", async (e) => {
      if ((e.key === "Enter" || e.key === " ") && !btn.disabled) {
        e.preventDefault();
        setEnabled(false);
        btn.classList.add("selected");
        showSnackbar(`You Picked: ${btn.textContent}`);
        await dispatchBattleEvent("statSelected");
        await handleStatSelection(store, btn.dataset.stat);
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
  // In Test Mode, always surface the debug panel to visualize state
  setDebugPanelEnabled(isEnabled("battleDebugPanel") || isEnabled("enableTestMode"));

  featureFlagsEmitter.addEventListener("change", () => {
    if (battleArea) battleArea.dataset.testMode = String(isEnabled("enableTestMode"));
    if (banner) banner.classList.toggle("hidden", !isEnabled("enableTestMode"));
    setTestMode(isEnabled("enableTestMode"));
    toggleInspectorPanels(isEnabled("enableCardInspector"));
    toggleViewportSimulation(isEnabled("viewportSimulation"));
    setDebugPanelEnabled(isEnabled("battleDebugPanel") || isEnabled("enableTestMode"));
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
