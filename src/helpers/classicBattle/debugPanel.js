import { getScores, getTimerState, isMatchEnded } from "../battleEngineFacade.js";
import { isTestModeEnabled, getCurrentSeed } from "../testModeUtils.js";
import { isEnabled } from "../featureFlags.js";
import { createButton } from "../../components/Button.js";
import { safeCall } from "./safeCall.js";
import { getStateSnapshot } from "./battleDebug.js";
import { readDebugState } from "./debugHooks.js";

function getDebugOutputEl() {
  return document.getElementById("debug-output");
}

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
      safeCall(() => navigator.clipboard.writeText(text));
    });
    summary.appendChild(btn);
  }
}

function getMachineDebugState() {
  const state = {};
  safeCall(() => {
    const snap = getStateSnapshot();
    if (snap.state) state.machineState = snap.state;
    if (snap.prev) state.machinePrevState = snap.prev;
    if (snap.event) state.machineLastEvent = snap.event;
    if (Array.isArray(snap.log)) state.machineLog = snap.log.slice();
    const rde = readDebugState("roundDecisionEnter");
    if (rde) state.roundDecisionEnter = rde;
    const gfa = readDebugState("guardFiredAt");
    if (gfa) state.guardFiredAt = gfa;
    const goe = readDebugState("guardOutcomeEvent");
    if (goe) state.guardOutcomeEvent = goe;
    addMachineDiagnostics(state);
  });
  return state;
}

function getStoreSnapshot(win) {
  const out = {};
  safeCall(() => {
    const store = win?.battleStore;
    if (store) {
      out.store = {
        selectionMade: !!store.selectionMade,
        playerChoice: store.playerChoice || null
      };
    }
  });
  return out;
}

function getBuildInfo(win) {
  const info = {};
  safeCall(() => {
    if (win?.__buildTag) info.buildTag = win.__buildTag;
    const rd = readDebugState("roundDebug");
    if (rd !== undefined) info.round = rd;
    if (Array.isArray(win?.__eventDebug)) info.eventDebug = win.__eventDebug.slice();
    const opp = win?.document?.getElementById("opponent-card");
    if (opp) {
      info.dom = { opponentChildren: opp.children ? opp.children.length : 0 };
    }
  });
  return info;
}

/**
 * Collect a consolidated debug snapshot for the current battle.
 *
 * @returns {Object} A plain object containing scores, timer, machine state,
 *   store snapshot and build/runtime diagnostics useful for tests and UI.
 *
 * @pseudocode
 * 1. Read base values from the battle facade (scores, timer, matchEnded).
 * 2. When test mode is enabled, attach the current random seed.
 * 3. Gather machine-specific diagnostics via `getMachineDebugState()`.
 * 4. Add a shallow snapshot of in-page store state and build info.
 * 5. Merge and return the resulting object.
 */
export function collectDebugState() {
  const base = {
    ...getScores(),
    timer: getTimerState(),
    matchEnded: isMatchEnded()
  };
  if (isTestModeEnabled()) base.seed = getCurrentSeed();
  const win = typeof window !== "undefined" ? window : null;
  return {
    ...base,
    ...getMachineDebugState(),
    ...getStoreSnapshot(win),
    ...getBuildInfo(win)
  };
}

function addMachineDiagnostics(state) {
  safeCall(() => {
    const getMachine = readDebugState("getClassicBattleMachine");
    const machine = typeof getMachine === "function" ? getMachine() : null;
    if (!machine || typeof machine.getState !== "function") return;
    state.machineReady = true;
    const current = machine.getState();
    const def = machine.statesByName?.get ? machine.statesByName.get(current) : null;
    if (!def || !Array.isArray(def.triggers)) return;
    state.machineTriggers = def.triggers.map((t) => t.on);
  });
}

/**
 * Render the debug state into a <pre> element.
 *
 * @param {HTMLElement} pre - Target <pre> element where JSON will be written.
 * @param {Object} state - Debug state object produced by `collectDebugState`.
 * @returns {void}
 *
 * @pseudocode
 * 1. If `pre` is falsy, do nothing.
 * 2. Serialize `state` to JSON and assign it to `pre.textContent`.
 */
export function renderDebugState(pre, state) {
  if (!pre) return;
  pre.textContent = JSON.stringify(state);
}

/**
 * Refresh the on-page debug panel output with the latest collected state.
 *
 * @returns {void}
 *
 * @pseudocode
 * 1. Locate the `<pre id="debug-output">` element.
 * 2. If the element exists, call `collectDebugState()` and render it.
 */
export function updateDebugPanel() {
  const pre = getDebugOutputEl();
  if (!pre) return;
  const state = collectDebugState();
  renderDebugState(pre, state);
}

/**
 * Initialize or migrate the debug panel DOM used for battle debugging.
 *
 * @returns {void}
 *
 * @pseudocode
 * 1. Find `#debug-panel` placeholder in the DOM; bail if missing.
 * 2. When test mode is enabled and `#battle-area` exists:
 *    - Ensure `#debug-panel` is a `<details>` with a `<summary>` and `<pre>`.
 *    - Wire a copy button and persist the `open` state to localStorage.
 *    - Insert the panel before the battle area and show it.
 * 3. Otherwise remove the placeholder panel from the DOM.
 */
export function initDebugPanel() {
  const debugPanel = document.getElementById("debug-panel");
  if (!debugPanel) return;
  const battleArea = document.getElementById("battle-area");

  // Check for feature flag override first
  const overrideEnabled =
    typeof window !== "undefined" && window.__FF_OVERRIDES && window.__FF_OVERRIDES.enableTestMode;

  if ((isEnabled("enableTestMode") || overrideEnabled) && battleArea) {
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
    safeCall(() => {
      const saved = localStorage.getItem("battleDebugOpen");
      panel.open = saved ? saved === "true" : true;
      panel.addEventListener("toggle", () => {
        safeCall(() => localStorage.setItem("battleDebugOpen", String(panel.open)));
      });
    });
    battleArea.before(panel);
    panel.classList.remove("hidden");
  } else {
    debugPanel.remove();
  }
}

/**
 * Enable or disable the debug panel UI.
 *
 * @param {boolean} enabled - When true, create/show the panel; otherwise hide/remove it.
 * @returns {void}
 *
 * @pseudocode
 * 1. If `enabled` is true:
 *    - Create `#debug-panel` as a `<details>` with a `<summary>` and `<pre>` if missing.
 *    - Ensure the copy button exists and restore `open` from localStorage.
 *    - Move the panel before the battle area and make it visible.
 * 2. If `enabled` is false and a panel exists, hide and remove it.
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
    safeCall(() => {
      const saved = localStorage.getItem("battleDebugOpen");
      panel.open = saved ? saved === "true" : true;
      panel.addEventListener("toggle", () => {
        safeCall(() => localStorage.setItem("battleDebugOpen", String(panel.open)));
      });
    });
    panel.classList.remove("hidden");
    if (battleArea && panel.nextElementSibling !== battleArea) {
      battleArea.before(panel);
    }
  } else if (panel) {
    panel.classList.add("hidden");
    panel.remove();
  }
}
