import { getOpponentCardData } from "./opponentController.js";
import { isEnabled, featureFlagsEmitter } from "../featureFlags.js";
import { getScores, getTimerState, isMatchEnded, STATS } from "../battleEngineFacade.js";
import { isTestModeEnabled, getCurrentSeed, setTestMode } from "../testModeUtils.js";
import { JudokaCard } from "../../components/JudokaCard.js";
import { setupLazyPortraits } from "../lazyPortrait.js";
import { showSnackbar } from "../showSnackbar.js";
import * as scoreboard from "../setupScoreboard.js";
import { showResult } from "../battle/index.js";
import { shouldReduceMotionSync } from "../motionUtils.js";
import { onFrame as scheduleFrame, cancel as cancelFrame } from "../../utils/scheduler.js";
import { handleStatSelection } from "./selectionHandler.js";
import { getCardStatValue } from "./cardStatUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";
import { onNextButtonClick, getNextRoundControls } from "./timerService.js";
import { loadStatNames } from "../stats.js";
import { toggleViewportSimulation } from "../viewportDebug.js";
import { toggleInspectorPanels } from "../cardUtils.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { syncScoreDisplay } from "./uiService.js";
import { onBattleEvent, emitBattleEvent } from "./battleEvents.js";

// Ensure a global statButtonsReadyPromise exists synchronously so tests
// and early code can safely await it even before `initStatButtons` runs.
if (typeof window !== "undefined") {
  try {
    if (!window.statButtonsReadyPromise) {
      let _resolve;
      window.statButtonsReadyPromise = new Promise((r) => {
        _resolve = r;
      });
      // Keep a handle to the current resolver so `initStatButtons` can
      // replace/resolve it when the real button wiring happens.
      window.__resolveStatButtonsReady = _resolve;
    }
  } catch {}
}

function getDebugOutputEl() {
  return document.getElementById("debug-output");
}

/**
 * Ensure the debug panel has a copy button that copies the panel text.
 *
 * @pseudocode
 * 1. Exit if `panel` lacks a `<summary>` element.
 * 2. Create a "Copy" button with id `debug-copy` when missing.
 * 3. On click, copy `#debug-output` text via `navigator.clipboard.writeText`.
 * 4. Prevent the click from toggling the `<details>` element.
 * 5. Append the button to the summary.
 *
 * @param {HTMLElement | null} panel Debug panel element.
 */
function ensureDebugCopyButton(panel) {
  if (!panel) return;
  const summary = panel.querySelector("summary");
  if (!summary) return;
  let btn = summary.querySelector("#debug-copy");
  if (!btn) {
    btn = createButton("Copy", { id: "debug-copy" });
    btn.dataset.tooltipId = "ui.copyDebug";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const text = getDebugOutputEl()?.textContent ?? "";
      try {
        navigator?.clipboard?.writeText(text);
      } catch {}
    });
    summary.appendChild(btn);
  }
}

/**
 * Display a snackbar prompting the player to choose a stat.
 *
 * @pseudocode
 * 1. Clear any existing text in `#round-message`.
 * 2. Show "Select your move" via `showSnackbar`.
 */
export function showSelectionPrompt() {
  const el = document.getElementById("round-message");
  if (el) {
    el.textContent = "";
  }
  showSnackbar("Select your move");
  emitBattleEvent("roundPrompt");
  try {
    if (isTestModeEnabled()) console.warn("[test] roundPrompt emitted");
  } catch {}
}

/**
 * Render the opponent card inside a container element.
 *
 * @pseudocode
 * 1. Extract lookup and inspector flag from `judoka`.
 * 2. Create a `JudokaCard` instance and render it to a DOM node.
 * 3. Clear and update the container, preserving the debug panel.
 * 4. Initialize lazy portrait loading when supported.
 *
 * @param {{lookup: object, enableInspector?: boolean}} judoka Judoka data plus render deps.
 * @param {HTMLElement | null} container Target container for the card.
 */
export async function renderOpponentCard(judoka, container) {
  if (!judoka || !container) return;
  const { lookup, enableInspector, ...data } = judoka;
  let card;
  try {
    const judokaCard = new JudokaCard(data, lookup, { enableInspector });
    if (judokaCard && typeof judokaCard.render === "function") {
      card = await judokaCard.render();
    } else {
      return;
    }
  } catch (err) {
    console.debug("Error rendering JudokaCard:", err);
    return;
  }
  const debugPanel = container.querySelector("#debug-panel");
  container.innerHTML = "";
  if (debugPanel) container.appendChild(debugPanel);
  container.appendChild(card);
  if (typeof IntersectionObserver !== "undefined") {
    try {
      setupLazyPortraits(card);
    } catch {}
  }
}

export function enableNextRoundButton() {
  const btn = document.getElementById("next-button");
  if (!btn) return;
  btn.disabled = false;
  btn.dataset.nextReady = "true";
}

export function disableNextRoundButton() {
  const btn = document.getElementById("next-button");
  if (!btn) return;
  btn.disabled = true;
  delete btn.dataset.nextReady;
}

/**
 * Gather scores, timer details, and machine diagnostics for the debug panel.
 *
 * @pseudocode
 * 1. Initialize state with scores, timer, and match end flag.
 * 2. Add test seed when test mode is active.
 * 3. Merge machine state and diagnostics when available.
 * 4. Append store snapshot, build info, and DOM status.
 * 5. Return accumulated state.
 */
export function collectDebugState() {
  const state = {
    ...getScores(),
    timer: getTimerState(),
    matchEnded: isMatchEnded()
  };
  if (isTestModeEnabled()) state.seed = getCurrentSeed();

  try {
    const win = typeof window !== "undefined" ? window : null;
    if (!win || !win.__classicBattleState) return state;
    state.machineState = win.__classicBattleState;
    if (win.__classicBattlePrevState) state.machinePrevState = win.__classicBattlePrevState;
    if (win.__classicBattleLastEvent) state.machineLastEvent = win.__classicBattleLastEvent;
    if (Array.isArray(win.__classicBattleStateLog))
      state.machineLog = win.__classicBattleStateLog.slice();
    if (win.__roundDecisionEnter) state.roundDecisionEnter = win.__roundDecisionEnter;
    if (win.__guardFiredAt) state.guardFiredAt = win.__guardFiredAt;
    if (win.__guardOutcomeEvent) state.guardOutcomeEvent = win.__guardOutcomeEvent;
    addMachineDiagnostics(win, state);
  } catch {}

  try {
    const store = typeof window !== "undefined" ? window.battleStore : null;
    if (store) {
      state.store = {
        selectionMade: !!store.selectionMade,
        playerChoice: store.playerChoice || null
      };
    }
  } catch {}

  try {
    const win = typeof window !== "undefined" ? window : null;
    if (win?.__buildTag) state.buildTag = win.__buildTag;
    if (win?.__roundDebug) state.round = win.__roundDebug;
    if (Array.isArray(win?.__eventDebug)) state.eventDebug = win.__eventDebug.slice();
    const opp = document.getElementById("opponent-card");
    if (opp) {
      state.dom = {
        opponentChildren: opp.children ? opp.children.length : 0
      };
    }
  } catch {}

  return state;
}

function addMachineDiagnostics(win, state) {
  try {
    const getMachine = win.__getClassicBattleMachine;
    const machine = typeof getMachine === "function" ? getMachine() : null;
    state.machineReady = !!(machine && typeof machine.getState === "function");
    if (!state.machineReady) return;
    const current = machine.getState();
    const def = machine.statesByName?.get ? machine.statesByName.get(current) : null;
    if (!def || !Array.isArray(def.triggers)) return;
    state.machineTriggers = def.triggers.map((t) => t.on);
  } catch {}
}

/**
 * Stringify debug state and write it to a DOM element.
 *
 * @pseudocode
 * 1. Exit if `pre` is missing.
 * 2. Stringify `state` with indentation.
 * 3. Assign result to `pre.textContent`.
 *
 * @param {HTMLElement | null} pre Target element to update.
 * @param {object} state Debug state object to render.
 */
export function renderDebugState(pre, state) {
  if (!pre) return;
  pre.textContent = JSON.stringify(state, null, 2);
}

/**
 * Update the debug panel with current game metrics and diagnostics.
 *
 * @pseudocode
 * 1. Obtain `#debug-output` element; exit if absent.
 * 2. Collect state via `collectDebugState`.
 * 3. Render the state with `renderDebugState`.
 */
export function updateDebugPanel() {
  const pre = getDebugOutputEl();
  if (!pre) return;
  const state = collectDebugState();
  renderDebugState(pre, state);
}

/**
 * Show the round outcome across UI elements.
 *
 * @pseudocode
 * 1. Display `message` via `showResult`.
 * 2. Forward the message to `scoreboard.showMessage`.
 * 3. Show the same message in a snackbar.
 *
 * @param {string} message - Outcome text to display.
 */
export function showRoundOutcome(message) {
  showResult(message);
  scoreboard.showMessage(message);
  showSnackbar(message);
}

/**
 * Show animated stat comparison for the last round.
 *
 * @pseudocode
 * 1. Obtain `#round-result` element; exit if missing.
 * 2. Cancel any previous animation frame stored in `store.compareRaf`.
 * 3. If reduced motion is preferred, update text immediately and exit.
 * 4. Otherwise animate values from current to target over 500ms using scheduler frames.
 * 5. Store the new frame id on `store.compareRaf`.
 *
 * @param {ReturnType<typeof createBattleStore>} store - Battle state store.
 * @param {string} stat - Stat key selected for the round.
 * @param {number} playerVal - Player's stat value.
 * @param {number} compVal - Opponent's stat value.
 */
export function showStatComparison(store, stat, playerVal, compVal) {
  const el = document.getElementById("round-result");
  if (!el) return;
  cancelFrame(store.compareRaf);
  const label = stat.charAt(0).toUpperCase() + stat.slice(1);
  const match = el.textContent.match(/You: (\d+).*Opponent: (\d+)/);
  const startPlayer = match ? Number(match[1]) : 0;
  const startComp = match ? Number(match[2]) : 0;
  if (shouldReduceMotionSync()) {
    el.textContent = `${label} – You: ${playerVal} Opponent: ${compVal}`;
    return;
  }
  const startTime = performance.now();
  const duration = 500;
  let id = 0;
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const p = Math.round(startPlayer + (playerVal - startPlayer) * progress);
    const c = Math.round(startComp + (compVal - startComp) * progress);
    el.textContent = `${label} – You: ${p} Opponent: ${c}`;
    if (progress >= 1) {
      cancelFrame(id);
      store.compareRaf = 0;
      return;
    }
    const next = scheduleFrame(step);
    cancelFrame(id);
    id = next;
    store.compareRaf = id;
  };
  id = scheduleFrame(step);
  store.compareRaf = id;
}

/**
 * Watch for orientation changes and update the battle header.
 *
 * @pseudocode
 * 1. Determine current orientation via `matchMedia` when possible.
 * 2. Apply orientation to `.battle-header[data-orientation]` when changed.
 * 3. Expose `window.applyBattleOrientation` for manual updates.
 * 4. If the header is missing, poll via `scheduleFrame` until applied.
 * 5. On resize/orientation change, throttle updates with `requestAnimationFrame`.
 */
export function watchBattleOrientation(callback) {
  if (typeof callback !== "function") {
    return;
  }

  const invoke = () => Promise.resolve(callback());
  try {
    window.applyBattleOrientation = invoke;
  } catch {}

  let pollId;
  const pollIfMissing = () => {
    if (pollId) return;
    pollId = scheduleFrame(() => {
      invoke().then((ok) => {
        if (ok) {
          cancelFrame(pollId);
          pollId = 0;
        }
      });
    });
  };

  invoke().then((ok) => {
    if (!ok) {
      pollIfMissing();
    }
  });

  let rafId;
  const onChange = () => {
    invoke().then((ok) => {
      if (!ok) {
        pollIfMissing();
      }
    });
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      invoke().then((ok) => {
        if (!ok) {
          pollIfMissing();
        }
      });
    });
  };

  window.addEventListener("orientationchange", onChange);
  window.addEventListener("resize", onChange);
}

/**
 * Create and display a retry modal when round start fails.
 *
 * @pseudocode
 * 1. Skip if `#round-retry-modal` already exists.
 * 2. Build modal elements and attach a Retry button.
 * 3. On click, close modal and invoke `retryFn`.
 * 4. Append modal to `document.body` and open it.
 *
 * @param {() => Promise<void>} retryFn - Function to retry round start.
 */
function showRetryModal(retryFn) {
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
    try {
      await retryFn();
    } catch {}
  });
  document.body.appendChild(modal.element);
  modal.open();
}

/**
 * Register handler to surface round start errors via UI.
 *
 * @pseudocode
 * 1. Define `onError` to show a message and retry modal.
 * 2. Listen for `round-start-error` on `document`.
 * 3. Return cleanup function to remove the listener.
 *
 * @param {() => Promise<void>} retryFn - Function invoked when retrying.
 * @returns {() => void} Cleanup function.
 */
export function registerRoundStartErrorHandler(retryFn) {
  const onError = () => {
    scoreboard.showMessage("Round start error. Please retry.");
    showRetryModal(retryFn);
  };
  document.addEventListener("round-start-error", onError);
  return () => document.removeEventListener("round-start-error", onError);
}

/**
 * Attach click handler to the Next button.
 *
 * @pseudocode
 * 1. Locate `#next-button`; exit if missing.
 * 2. Add `onNextButtonClick` listener for `click` events.
 */
export function setupNextButton() {
  const btn = document.getElementById("next-button");
  if (!btn) return;
  btn.addEventListener("click", (e) => onNextButtonClick(e, getNextRoundControls()));
}

/**
 * Initialize stat selection buttons.
 *
 * @pseudocode
 * 1. Gather all stat buttons inside `#stat-buttons`.
 * 2. Expose `selectStat` to handle selection and UI updates.
 * 3. Provide `setEnabled` helper to toggle state and manage `statButtonsReadyPromise`.
 * 4. Return controls to enable or disable the group.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - Battle store.
 */
let statButtons = [];
let statContainer;
let resolveReady;

function resetStatButtonsReady() {
  if (typeof window === "undefined") return;
  window.statButtonsReadyPromise = new Promise((r) => {
    resolveReady = r;
    try {
      window.__resolveStatButtonsReady = r;
    } catch {}
  });
}

function setStatButtonsEnabled(enable = true) {
  statButtons.forEach((btn) => {
    btn.disabled = !enable;
    btn.tabIndex = enable ? 0 : -1;
    btn.classList.toggle("disabled", !enable);
  });
  if (statContainer) {
    statContainer.dataset.buttonsReady = String(enable);
  }
  if (enable) {
    try {
      resolveReady?.();
    } catch {}
    try {
      if (isTestModeEnabled()) console.warn("[test] statButtonsReady=true");
    } catch {}
  } else {
    resetStatButtonsReady();
    try {
      if (isTestModeEnabled()) console.warn("[test] statButtonsReady=false");
    } catch {}
  }
}

/**
 * Delegate stat selection to `handleStatSelection`.
 * UI updates are handled by the `statSelected` listener in `roundUI.js`.
 *
 * @pseudocode
 * 1. Verify the requested stat button exists and is enabled.
 * 2. Gather player and opponent values and pass them to `handleStatSelection`.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - Battle store.
 * @param {string} statName - Key of the selected stat.
 */
export function selectStat(store, statName) {
  const btn = document.querySelector(`#stat-buttons button[data-stat="${statName}"]`);
  if (!btn || btn.disabled) return;

  setStatButtonsEnabled(false);
  btn.classList.add("selected");

  try {
    const playerCard = document.getElementById("player-card");
    const opponentCard = document.getElementById("opponent-card");
    const playerVal = getCardStatValue(playerCard, statName);
    let opponentVal = getCardStatValue(opponentCard, statName);
    try {
      const opp = getOpponentJudoka();
      const raw = opp && opp.stats ? Number(opp.stats[statName]) : NaN;
      opponentVal = Number.isFinite(raw) ? raw : opponentVal;
    } catch {}
    Promise.resolve(handleStatSelection(store, statName, { playerVal, opponentVal })).catch(
      () => {}
    );
  } catch {}
  try {
    showSnackbar(`You Picked: ${btn.textContent}`);
  } catch {}
}

export function initStatButtons(store) {
  statButtons = document.querySelectorAll("#stat-buttons button");
  statContainer = document.getElementById("stat-buttons");
  resetStatButtonsReady();
  setStatButtonsEnabled(false);

  statButtons.forEach((btn) => {
    const statName = btn.dataset.stat;
    const handler = () => selectStat(store, statName);
    btn.addEventListener("click", handler);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler();
      }
    });
  });

  return {
    enable: () => setStatButtonsEnabled(true),
    disable: () => setStatButtonsEnabled(false)
  };
}

/**
 * Apply localized stat labels to selection buttons.
 *
 * @pseudocode
 * 1. Load stat names via `loadStatNames`.
 * 2. Map each name to the corresponding button's text and aria-label.
 */
export async function applyStatLabels() {
  const names = await loadStatNames();
  names.forEach((n, i) => {
    const key = STATS[i];
    // Defensive: ensure `key` is a string before building a selector. If not, record for diagnostics.
    let btn = null;
    try {
      if (typeof key !== "string") {
        try {
          if (typeof window !== "undefined")
            window.__classicBattleQuerySelectorError = { key, where: "uiHelpers.applyStatLabels" };
        } catch {}
      } else {
        btn = document.querySelector(`#stat-buttons button[data-stat="${key}"]`);
      }
    } catch (e) {
      try {
        if (typeof window !== "undefined")
          window.__classicBattleQuerySelectorError = {
            key,
            where: "uiHelpers.applyStatLabels",
            err: String(e)
          };
      } catch {}
    }
    if (btn) {
      btn.textContent = n.name;
      btn.setAttribute("aria-label", `Select ${n.name}`);
    }
  });
}

/**
 * Update the text content of the battle state badge.
 *
 * @param {string | null} state The current battle state.
 */
export function updateBattleStateBadge(state) {
  const badge = document.getElementById("battle-state-badge");
  if (!badge) return;
  try {
    badge.textContent = state ? `State: ${state}` : "State: —";
  } catch {
    badge.textContent = "State: —";
  }
}

/**
 * Toggle visibility of the battle state badge based on feature flag.
 *
 * @pseudocode
 * 1. If disabled, remove existing badge and exit.
 * 2. Ensure badge element exists under scoreboard or header.
 * 3. Update text content with current state when available.
 */
export function setBattleStateBadgeEnabled(enable) {
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
  updateBattleStateBadge(
    typeof document !== "undefined" ? document.body?.dataset.battleState || null : null
  );
}

/**
 * Apply battle-related feature flags to the page.
 *
 * @pseudocode
 * 1. Set mode/test-mode data attributes on `battleArea`.
 * 2. Toggle test banner visibility and various debug features.
 * 3. Reapply flags when `featureFlagsEmitter` emits changes.
 *
 * @param {HTMLElement|null} battleArea
 * @param {HTMLElement|null} banner
 */
export function applyBattleFeatureFlags(battleArea, banner) {
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

/**
 * Initialize the optional debug panel.
 *
 * @pseudocode
 * 1. Locate `#debug-panel`; exit if missing.
 * 2. If enabled and the battle area exists, ensure the panel is a `<details>` element.
 * 3. Insert a copy button into the summary.
 * 4. Restore open state from localStorage and insert before the battle area.
 * 5. Otherwise remove the panel.
 */
export function initDebugPanel() {
  const debugPanel = document.getElementById("debug-panel");
  if (!debugPanel) return;
  const battleArea = document.getElementById("battle-area");
  if (isEnabled("battleDebugPanel") && battleArea) {
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
    ensureDebugCopyButton(panel);
    try {
      const saved = localStorage.getItem("battleDebugOpen");
      panel.open = saved ? saved === "true" : true;
      panel.addEventListener("toggle", () => {
        try {
          localStorage.setItem("battleDebugOpen", String(panel.open));
        } catch {}
      });
    } catch {}
    battleArea.before(panel);
    panel.classList.remove("hidden");
  } else {
    debugPanel.remove();
  }
}

/**
 * Enable or disable the debug panel dynamically.
 *
 * @pseudocode
 * 1. If enabling, ensure a `<details>` panel exists and insert before the battle area.
 * 2. Attach a copy button to the panel summary.
 * 3. Persist open state to localStorage on toggle.
 * 4. If disabling, hide and remove the panel.
 */
export function setDebugPanelEnabled(enabled) {
  const battleArea = document.getElementById("battle-area");
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
    ensureDebugCopyButton(panel);
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
    if (battleArea && panel.nextElementSibling !== battleArea) {
      battleArea.before(panel);
    }
  } else if (panel) {
    panel.classList.add("hidden");
    panel.remove();
  }
}

/**
 * Show a temporary hint for stat buttons.
 *
 * @pseudocode
 * 1. Skip if `localStorage.statHintShown` is set or unavailable.
 * 2. Dispatch `mouseenter` on `#stat-help`.
 * 3. After `durationMs` via `setTimeoutFn`, dispatch `mouseleave`.
 * 4. Record that the hint has been shown.
 *
 * @param {number} [durationMs=3000] Hover duration in milliseconds.
 * @param {(fn: () => void, ms: number) => any} [setTimeoutFn=setTimeout] Timer function.
 */
export function maybeShowStatHint(durationMs = 3000, setTimeoutFn = setTimeout) {
  try {
    if (typeof localStorage === "undefined") return;
    const hintShown = localStorage.getItem("statHintShown");
    if (hintShown) return;
    const help = document.getElementById("stat-help");
    help?.dispatchEvent(new Event("mouseenter"));
    setTimeoutFn(() => {
      help?.dispatchEvent(new Event("mouseleave"));
    }, durationMs);
    localStorage.setItem("statHintShown", "true");
  } catch {}
}

/**
 * Reset battle UI elements to their initial state.
 *
 * @pseudocode
 * 1. Remove any active modal backdrops and destroy `store.quitModal`.
 * 2. Replace the Next Round and Quit buttons with fresh clones.
 * 3. Clear scoreboard messages and disable the Next Round button.
 *
 * @param {ReturnType<import("./roundManager.js").createBattleStore>} [store]
 * - Optional battle state store used to tear down the quit modal.
 */
export function resetBattleUI(store) {
  try {
    document.querySelectorAll?.(".modal-backdrop").forEach((m) => {
      if (typeof m.remove === "function") m.remove();
    });
  } catch {}
  if (store?.quitModal) {
    try {
      store.quitModal.destroy();
    } catch {}
    store.quitModal = null;
  }

  let nextBtn;
  try {
    nextBtn = document.getElementById ? document.getElementById("next-button") : null;
  } catch {}
  if (nextBtn) {
    const clone = nextBtn.cloneNode(true);
    clone.disabled = true;
    delete clone.dataset.nextReady;
    clone.addEventListener("click", (e) => onNextButtonClick(e, getNextRoundControls()));
    nextBtn.replaceWith(clone);
  }

  let quitBtn;
  try {
    quitBtn = document.getElementById ? document.getElementById("quit-match-button") : null;
  } catch {}
  if (quitBtn) {
    quitBtn.replaceWith(quitBtn.cloneNode(true));
  }

  try {
    scoreboard.clearMessage();
  } catch {}
  let timerEl;
  try {
    timerEl = document.getElementById ? document.getElementById("next-round-timer") : null;
  } catch {}
  if (timerEl) timerEl.textContent = "";
  let roundResultEl;
  try {
    roundResultEl = document.getElementById ? document.getElementById("round-result") : null;
  } catch {}
  if (roundResultEl) roundResultEl.textContent = "";
  try {
    syncScoreDisplay();
  } catch {}
  updateDebugPanel();
}

// --- Event bindings ---

if (typeof window !== "undefined") {
  window.addEventListener("game:reset-ui", (e) => {
    resetBattleUI(e.detail?.store);
  });
}

let opponentDelayMs = 500;

/**
 * Set the delay before the opponent snackbar appears.
 *
 * @pseudocode
 * 1. If `ms` is a finite number, update `opponentDelayMs`.
 *
 * @param {number} ms Delay in milliseconds.
 */
export function setOpponentDelay(ms) {
  if (Number.isFinite(ms)) {
    opponentDelayMs = ms;
  }
}

let opponentSnackbarId = 0;

onBattleEvent("opponentReveal", () => {
  const container = document.getElementById("opponent-card");
  getOpponentCardData()
    .then((j) => j && renderOpponentCard(j, container))
    .catch(() => {});
});

onBattleEvent("statSelected", () => {
  scoreboard.clearTimer();
  opponentSnackbarId = setTimeout(() => showSnackbar("Opponent is choosing…"), opponentDelayMs);
});

onBattleEvent("roundResolved", (e) => {
  clearTimeout(opponentSnackbarId);
  const { store, stat, playerVal, opponentVal, result } = e.detail || {};
  if (!result) return;
  showRoundOutcome(result.message || "");
  showStatComparison(store, stat, playerVal, opponentVal);
  updateDebugPanel();
});
