/**
 * Page wrapper for Classic Battle mode.
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
import { initClassicBattleOrchestrator } from "./classicBattle/orchestrator.js";
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
    modal.destroy();
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

function watchBattleOrientation() {
  const getOrientation = () => {
    try {
      const portrait = window.innerHeight >= window.innerWidth;
      if (typeof window.matchMedia === "function") {
        const mm = window.matchMedia("(orientation: portrait)");
        if (typeof mm.matches === "boolean" && mm.matches !== portrait) {
          return portrait ? "portrait" : "landscape";
        }
        return mm.matches ? "portrait" : "landscape";
      }
      return portrait ? "portrait" : "landscape";
    } catch {
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

  try {
    window.applyBattleOrientation = () => {
      try {
        apply();
      } catch {}
    };
  } catch {}

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
  watchBattleOrientation();
  await initFeatureFlags();
  try {
    if (isEnabled("enableTestMode")) {
      window.__disableSnackbars = true;
    }
  } catch {}
  setupNextButton();
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
  const cleanupBattleStateProgress = await initBattleStateProgress();
  if (cleanupBattleStateProgress) {
    window.addEventListener("pagehide", cleanupBattleStateProgress, { once: true });
  }
  await initClassicBattleOrchestrator(battleStore, startRoundWrapper);
  applyStatLabels().catch(() => {});
  await initTooltips();
  maybeShowStatHint();

  try {
    window.freezeBattleHeader = () => {
      try {
        pauseTimer();
        try {
          stopScheduler();
        } catch {}
      } catch {}
    };
    window.resumeBattleHeader = () => {
      try {
        try {
          startScheduler();
        } catch {}
        resumeTimer();
      } catch {}
    };
  } catch {}

  const quitBtn = document.getElementById("quit-match-button");
  if (quitBtn) {
    quitBtn.addEventListener("click", async () => {
      if (window.battleStore) {
        const { quitMatch } = await import("./classicBattle/quitModal.js");
        quitMatch(window.battleStore, quitBtn);
        window.homeLinkReady = true;
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
    const statName = btn.dataset.stat;
    const clickHandler = async () => {
      if (btn.disabled) return;
      setEnabled(false);
      btn.classList.add("selected");
      showSnackbar(`You Picked: ${btn.textContent}`);
      await handleStatSelection(store, statName);
    };
    btn.addEventListener("click", clickHandler);
    btn.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        await clickHandler();
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
    if (debugPanel.tagName !== "DETAILS") {
      const details = document.createElement("details");
      details.id = "debug-panel";
      details.className = debugPanel.className;
      const summary = document.createElement("summary");
      summary.textContent = "Battle Debug";
      const pre = debugPanel.querySelector("#debug-output") || document.createElement("pre");
      pre.id = "debug-output";
      pre.setAttribute("role", "status");
      pre.setAttribute("aria-live", "polite");
      details.append(summary, pre);
      debugPanel.replaceWith(details);
    }
    const panel = document.getElementById("debug-panel");
    try {
      const saved = localStorage.getItem("battleDebugOpen");
      panel.open = saved ? saved === "true" : true;
      panel.addEventListener("toggle", () => {
        try {
          localStorage.setItem("battleDebugOpen", String(panel.open));
        } catch {}
      });
    } catch {}
    computerSlot.prepend(panel);
    panel.classList.remove("hidden");
  } else {
    debugPanel.remove();
  }
}

function setDebugPanelEnabled(enabled) {
  const computerSlot = document.getElementById("computer-card");
  let panel = document.getElementById("debug-panel");
  if (enabled) {
    if (!panel) {
      panel = document.createElement("details");
      panel.id = "debug-panel";
      panel.className = "debug-panel";
      const summary = document.createElement("summary");
      summary.textContent = "Battle Debug";
      const pre = document.createElement("pre");
      pre.id = "debug-output";
      pre.setAttribute("role", "status");
      pre.setAttribute("aria-live", "polite");
      panel.append(summary, pre);
    } else if (panel.tagName !== "DETAILS") {
      const details = document.createElement("details");
      details.id = panel.id;
      details.className = panel.className;
      const summary = document.createElement("summary");
      summary.textContent = "Battle Debug";
      const pre = panel.querySelector("#debug-output") || document.createElement("pre");
      pre.id = "debug-output";
      pre.setAttribute("role", "status");
      pre.setAttribute("aria-live", "polite");
      details.append(summary, pre);
      panel.replaceWith(details);
      panel = details;
    }
    try {
      const saved = localStorage.getItem("battleDebugOpen");
      panel.open = saved ? saved === "true" : true;
      panel.addEventListener("toggle", () => {
        try {
          localStorage.setItem("battleDebugOpen", String(panel.open));
        } catch {}
      });
    } catch {}
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
  } catch {}
}

if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
  onDomReady(setupClassicBattlePage);
}
