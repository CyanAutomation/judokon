import { getScores, getTimerState, isMatchEnded } from "../battleEngineFacade.js";
import { isTestModeEnabled, getCurrentSeed } from "../testModeUtils.js";
import { isEnabled } from "../featureFlags.js";
import { createButton } from "../../components/Button.js";
import { safeCall } from "./safeCall.js";
import { getStateSnapshot } from "./battleDebug.js";
import { readDebugState } from "./debugHooks.js";

const debugPanelToggleListeners = new WeakMap();

/**
 * Get the debug output element from the DOM.
 *
 * @returns {HTMLElement|null} The debug output element or null if not found.
 * @summary Locate the debug output <pre> element for displaying debug state.
 * @pseudocode
 * 1. Query the DOM for element with id "debug-output".
 * 2. Return the element or null if not found.
 */
function getDebugOutputEl() {
  return document.getElementById("debug-output");
}

/**
 * Ensure a copy button exists in the debug panel summary.
 *
 * @param {HTMLElement} panel - The debug panel element.
 * @summary Add a copy button to the debug panel for copying debug output.
 * @pseudocode
 * 1. Check if panel and summary elements exist.
 * 2. Look for existing copy button, create one if missing.
 * 3. Add click handler to copy debug output to clipboard.
 * 4. Append the button to the summary element.
 *
 * @returns {void}
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
      safeCall(() => navigator.clipboard.writeText(text));
    });
    summary.appendChild(btn);
  }
}

/**
 * Ensure the debug panel has the correct DOM structure.
 *
 * @param {HTMLElement} panel - The debug panel element to structure.
 * @param {object} [options] - Configuration options.
 * @param {boolean} [options.createIfMissing=false] - Whether to create panel if missing.
 * @summary Ensure debug panel is a proper <details> element with summary and pre elements.
 * @pseudocode
 * 1. Return null if panel is missing and createIfMissing is false.
 * 2. Create a new <details> element if panel doesn't exist.
 * 3. Convert existing element to <details> if it's not already.
 * 4. Ensure <summary> and <pre> elements exist with proper attributes.
 * 5. Add copy button and return the structured panel.
 *
 * @returns {HTMLElement|null} The structured debug panel or null.
 */
function ensureDebugPanelStructure(panel, { createIfMissing = false } = {}) {
  let node = panel;
  if (!node && !createIfMissing) return null;
  if (!node) {
    node = document.createElement("details");
    node.id = "debug-panel";
    node.className = "debug-panel";
  }
  if (node.tagName !== "DETAILS") {
    const details = document.createElement("details");
    details.id = node.id || "debug-panel";
    details.className = node.className;
    if (node.parentNode) {
      node.replaceWith(details);
    }
    node = details;
  }
  let summary = node.querySelector("summary");
  if (!summary) {
    summary = document.createElement("summary");
    node.prepend(summary);
  }
  summary.textContent = "Battle Debug";
  let pre = node.querySelector("#debug-output");
  if (!pre) {
    pre = document.createElement("pre");
    node.append(pre);
  }
  if (summary.nextElementSibling !== pre) {
    node.insertBefore(pre, summary.nextSibling);
  }
  pre.id = "debug-output";
  pre.setAttribute("role", "status");
  pre.setAttribute("aria-live", "polite");
  ensureDebugCopyButton(node);
  return node;
}

/**
 * Persist the debug panel's open/closed state to localStorage.
 *
 * @param {HTMLElement} panel - The debug panel element.
 * @summary Save and restore debug panel toggle state across page reloads.
 * @pseudocode
 * 1. Restore open state from localStorage if available.
 * 2. Add toggle event listener if not already present.
 * 3. Save state to localStorage whenever panel is toggled.
 * 4. Use WeakMap to track listeners and avoid duplicates.
 *
 * @returns {void}
 */
function persistDebugPanelState(panel) {
  if (!panel) return;
  safeCall(() => {
    const saved = localStorage.getItem("battleDebugOpen");
    panel.open = saved ? saved === "true" : true;
  });
  if (!debugPanelToggleListeners.has(panel)) {
    const handler = () => {
      safeCall(() => localStorage.setItem("battleDebugOpen", String(panel.open)));
    };
    panel.addEventListener("toggle", handler);
    debugPanelToggleListeners.set(panel, handler);
  }
}

/**
 * Mount the debug panel in the correct position relative to battle area.
 *
 * @param {HTMLElement} panel - The debug panel element to mount.
 * @param {HTMLElement} battleArea - The battle area element.
 * @summary Position and show the debug panel in the DOM.
 * @pseudocode
 * 1. Check if panel exists.
 * 2. Position panel before battle area if not already positioned.
 * 3. Remove hidden class to make panel visible.
 *
 * @returns {void}
 */
function mountDebugPanel(panel, battleArea) {
  if (!panel) return;
  if (battleArea && panel.nextElementSibling !== battleArea) {
    battleArea.before(panel);
  }
  panel.classList.remove("hidden");
}

/**
 * Collect debug state information from the battle state machine.
 *
 * @returns {object} Object containing machine state, previous state, last event, and diagnostics.
 * @summary Gather comprehensive debug information from the battle state machine.
 * @pseudocode
 * 1. Initialize empty state object.
 * 2. Safely collect state snapshot from battle debug utilities.
 * 3. Add machine state, previous state, last event, and event log.
 * 4. Include additional debug state values like round decision timing.
 * 5. Add machine diagnostics and return the collected state.
 *
 * @returns {object}
 */
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

/**
 * Get a snapshot of the battle store state.
 *
 * @param {Window} win - The window object containing the battle store.
 * @returns {object} Object containing store state information.
 * @summary Extract relevant battle store state for debugging.
 * @pseudocode
 * 1. Initialize empty output object.
 * 2. Safely access the battle store from the window object.
 * 3. Extract key store properties like selection state and player choice.
 * 4. Return the collected store snapshot.
 *
 * @returns {object}
 */
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

/**
 * Collect build and runtime information for debugging.
 *
 * @param {Window} win - The window object containing build information.
 * @returns {object} Object containing build tag, round debug info, and DOM state.
 * @summary Gather build version and runtime diagnostic information.
 * @pseudocode
 * 1. Initialize empty info object.
 * 2. Safely collect build tag from window object.
 * 3. Add round debug information from debug state.
 * 4. Include event debug array if available.
 * 5. Add DOM information about opponent card element.
 * 6. Return the collected build information.
 *
 * @returns {object}
 */
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

/**
 * Add diagnostic information about the state machine to the debug state.
 *
 * @param {object} state - The debug state object to augment.
 * @summary Add machine readiness and trigger information to debug state.
 * @pseudocode
 * 1. Retrieve the machine getter function from debug state.
 * 2. Call the getter to obtain the machine instance.
 * 3. Check if machine has required methods and get current state.
 * 4. Look up state definition and extract trigger information.
 * 5. Add machine readiness flag and trigger array to state object.
 *
 * @returns {void}
 */
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
    const panel = ensureDebugPanelStructure(debugPanel);
    if (!panel) return;
    persistDebugPanelState(panel);
    mountDebugPanel(panel, battleArea);
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
    panel = ensureDebugPanelStructure(panel, { createIfMissing: true });
    if (!panel) return;
    persistDebugPanelState(panel);
    mountDebugPanel(panel, battleArea);
  } else if (panel) {
    panel.classList.add("hidden");
    panel.remove();
  }
}
