/**
 * Classic Battle CLI bootstrap and controller.
 * Wires the classic battle engine/state machine to a terminal-style UI.
 *
 * Exports the `init` entry point and helper handlers used by tests.
 *
 * @module pages/battleCLI/init
 */

import {
  createBattleStore,
  startRound as startRoundCore,
  resetGame
} from "../../helpers/classicBattle/roundManager.js";
import * as battleOrchestrator from "../../helpers/classicBattle/orchestrator.js";
import { createBattleInstance } from "../../helpers/classicBattle/createBattleInstance.js";
import {
  onBattleEvent,
  offBattleEvent,
  emitBattleEvent,
  resetBattleEventDedupeState
} from "../../helpers/classicBattle/battleEvents.js";
import { STATS } from "../../helpers/BattleEngine.js";
import * as engineFacade from "../../helpers/BattleEngine.js";
import statNamesData from "../../data/statNames.js";
import { fetchJson } from "../../helpers/dataUtils.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { showSnackbar } from "../../helpers/showSnackbar.js";
import { setDetailsOpen } from "../../helpers/detailsToggle.js";
import {
  initFeatureFlags,
  isEnabled,
  setFlag,
  featureFlagsEmitter
} from "../../helpers/featureFlags.js";
import { initDebugFlagHud } from "../../helpers/debugFlagHud.js";
import {
  skipRoundCooldownIfEnabled,
  updateBattleStateBadge
} from "../../helpers/classicBattle/uiHelpers.js";
import { getStateSnapshot } from "../../helpers/classicBattle/battleDebug.js";
import { autoSelectStat } from "../../helpers/classicBattle/autoSelectStat.js";
import { createRoundTimer } from "../../helpers/timers/createRoundTimer.js";
import { setTestMode } from "../../helpers/testModeUtils.js";
import { wrap } from "../../helpers/storage.js";
import { BATTLE_POINTS_TO_WIN } from "../../config/storageKeys.js";
import { POINTS_TO_WIN_OPTIONS } from "../../config/battleDefaults.js";
import * as debugHooks from "../../helpers/classicBattle/debugHooks.js";
import {
  setAutoContinue,
  getAutoContinue
} from "../../helpers/classicBattle/orchestratorHandlers.js";
import { resolveRoundStartPolicy } from "../../helpers/classicBattle/roundSelectModal.js";
import { domStateListener } from "../../helpers/classicBattle/stateTransitionListeners.js";
import { bindRoundUIEventHandlersDynamic } from "../../helpers/classicBattle/roundUI.js";
import { bindRoundFlowControllerOnce } from "../../helpers/classicBattle/roundFlowController.js";

import { exposeTestAPI } from "../../helpers/testApi.js";
// Phase 2: Shared Scoreboard imports for dual-write
import { setupScoreboard } from "../../helpers/setupScoreboard.js";
import { initBattleScoreboardAdapter } from "../../helpers/battleScoreboard.js";
import { version as stateCatalogVersion } from "../../helpers/classicBattle/stateCatalog.js";
/**
 * Re-export of syncWinTargetDropdown from winTargetSync.js
 *
 * @see ../../helpers/classicBattle/winTargetSync.js
 * @returns {void}
 * @pseudocode
 * 1. This is a re-export - see original function documentation.
 */
export { syncWinTargetDropdown } from "../../helpers/classicBattle/winTargetSync.js";
// Phase 4: Removed redundant scoreboardShowMessage, updateScore, updateTimer, updateRoundCounter imports
// These are now handled by the shared Scoreboard adapter
import state, { resolveEscapeHandled, getEscapeHandledPromise } from "./state.js";
import { onKeyDown, installIntentRejectionFeedback } from "./events.js";
import { registerBattleHandlers } from "./battleHandlers.js";
import {
  byId,
  updateRoundHeader,
  setRoundMessage,
  updateScoreLine,
  clearVerboseLog,
  ensureVerboseScrollHandling,
  refreshVerboseScrollIndicators
} from "./dom.js";
import { createCliDomFragment } from "./cliDomTemplate.js";
import { resolveRoundForTest as resolveRoundForTestHelper } from "./testSupport.js";

const hasDocument = typeof document !== "undefined";
const getSafeDocument = () => (hasDocument ? document : null);
const getActiveElement = () => getSafeDocument()?.activeElement ?? null;

function handleShortcutsToggle(event) {
  const target = event?.currentTarget;
  if (!target || typeof target !== "object") {
    return;
  }
  const isDetails = typeof target.open === "boolean";
  if (!isDetails) {
    return;
  }
  const isOpen = target.open === true;
  const closeButton = byId("cli-shortcuts-close");
  if (closeButton) {
    closeButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
  try {
    localStorage.setItem("battleCLI.shortcutsCollapsed", isOpen ? "0" : "1");
  } catch {}
  if (isOpen) {
    try {
      pauseTimers();
    } catch {}
    state.shortcutsOverlay = true;
    return;
  }
  try {
    resumeTimers();
  } catch {}
  try {
    state.shortcutsReturnFocus?.focus();
  } catch {}
  state.shortcutsReturnFocus = null;
  state.shortcutsOverlay = null;
}

/**
 * Handle Escape key presses at the document level.
 *
 * @pseudocode
 * 1. Ignore keys other than Escape.
 * 2. If the CLI shortcuts overlay is open, close it.
 * 3. Resolve the Escape-handled promise for awaiting callers.
 */
function handleGlobalEscape(event) {
  if (event?.key !== "Escape") {
    return;
  }
  if (state.shortcutsOverlay) {
    hideCliShortcuts();
  }
  if (hasDocument) {
    const dialogs = Array.from(document.querySelectorAll("dialog.modal[open]"));
    const activeDialog = dialogs.at(-1);
    if (activeDialog) {
      const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true });
      activeDialog.dispatchEvent(cancelEvent);
      try {
        if (!cancelEvent.defaultPrevented && typeof activeDialog.close === "function") {
          activeDialog.close();
        }
      } catch {}
    }
  }
  try {
    queueMicrotask(() => resolveEscapeHandled());
  } catch {
    Promise.resolve().then(() => resolveEscapeHandled());
  }
}

// Initialize engine and subscribe to engine events when available.
try {
  if (
    (typeof window === "undefined" || !window.__TEST__) &&
    typeof engineFacade.createBattleEngine === "function"
  ) {
    engineFacade.createBattleEngine();
  }
} catch {}

// Engine event wiring is installed during init() to avoid touching mocked
// module exports during unit tests that import this module.

let battleInstance = null;

function disposeClassicBattleOrchestrator() {
  try {
    battleInstance?.dispose?.();
  } catch {
    /* ignore: orchestrator may not be initialized */
  }
  battleInstance = null;
}

/**
 * Safely read and validate a saved points-to-win preference from localStorage.
 *
 * @returns {{found: boolean, value?: number, error?: Error}}
 * @pseudocode
 * 1. Try to read the raw `BATTLE_POINTS_TO_WIN` value from localStorage.
 * 2. If localStorage access throws, return `{ found: false, error }`.
 * 3. Treat empty/missing values as `{ found: false }`.
 * 4. Parse to number and validate as finite positive integer.
 * 5. Return `{ found: true, value }` for valid values, otherwise `{ found: false }`.
 */
function safeGetPointsToWinFromStorage() {
  try {
    if (typeof localStorage === "undefined") {
      return { found: false };
    }
    const rawValue = localStorage.getItem(BATTLE_POINTS_TO_WIN);
    if (rawValue === null || rawValue === "") {
      return { found: false };
    }
    const parsedValue = Number(rawValue);
    const isValid =
      Number.isFinite(parsedValue) && Number.isInteger(parsedValue) && parsedValue > 0;
    if (!isValid) {
      return { found: false };
    }
    return { found: true, value: parsedValue };
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Safely dispatch an event to the classic battle machine.
 *
 * @param {string} eventName
 * @param {*} [payload]
 * @returns {Promise<{ok: boolean, eventName: string, via?: "debugHooks.machine"|"orchestrator", result?: *, reason?: "no_machine", error?: Error}>}
 * @pseudocode
 * 1. Try debugHooks channel first to get the live machine and call `dispatch`.
 * 2. Fallback to orchestrator's `dispatchBattleEvent` if available (when not mocked).
 * 3. Return explicit failure contract when no dispatch handler is available.
 * 4. Return error contract when a dispatch handler throws.
 */
export async function safeDispatch(eventName, payload) {
  // DEBUG: Store dispatch attempts to understand why stat selection fails
  const isDebugEvent = eventName === "statSelected";
  const debugLog = (msg) => {
    try {
      const logs = JSON.parse(localStorage.getItem("__DEBUG_DISPATCH_LOG") || "[]");
      logs.push(`${new Date().toISOString()}: ${msg}`);
      if (logs.length > 100) logs.shift();
      localStorage.setItem("__DEBUG_DISPATCH_LOG", JSON.stringify(logs));
    } catch {}
    if (isDebugEvent) {
      console.log("[CLI.safeDispatch]", msg);
    }
  };

  if (isDebugEvent) {
    debugLog("Attempting dispatch: " + eventName);
  }

  try {
    const getter = debugHooks?.readDebugState?.("getClassicBattleMachine");
    const m = typeof getter === "function" ? getter() : getter;
    if (isDebugEvent) {
      debugLog(
        `debugHooks getter result: getter=${typeof getter}, machine=${m ? "exists" : "null"}`
      );
    }
    if (m?.dispatch) {
      if (isDebugEvent) {
        debugLog("Using debugHooks machine dispatch");
      }
      const result =
        payload === undefined ? await m.dispatch(eventName) : await m.dispatch(eventName, payload);
      return {
        ok: true,
        eventName,
        via: "debugHooks.machine",
        result
      };
    }
  } catch (err) {
    if (isDebugEvent) {
      debugLog(`debugHooks path failed: ${err?.message}`);
    }
  }

  try {
    const fn = battleOrchestrator?.dispatchBattleEvent;
    if (isDebugEvent) {
      debugLog(`battleOrchestrator.dispatchBattleEvent: ${typeof fn}`);
    }
    if (typeof fn === "function") {
      if (isDebugEvent) {
        debugLog("Using battleOrchestrator dispatch");
      }
      const result = payload === undefined ? await fn(eventName) : await fn(eventName, payload);
      return {
        ok: true,
        eventName,
        via: "orchestrator",
        result
      };
    }
  } catch (err) {
    if (isDebugEvent) {
      debugLog(`battleOrchestrator path failed: ${err?.message}`);
    }
    return {
      ok: false,
      eventName,
      reason: "no_machine",
      error: err instanceof Error ? err : new Error(String(err))
    };
  }

  if (isDebugEvent) {
    debugLog(`DISPATCH FAILED - no handler found for: ${eventName}`);
  }

  return {
    ok: false,
    eventName,
    reason: "no_machine"
  };
}

/**
 * Retrieve the current classic battle machine via the debug hooks channel.
 *
 * @returns {object|null} The active battle machine when available, otherwise `null`.
 * @pseudocode
 * 1. Read the `getClassicBattleMachine` getter from debug hooks.
 * 2. Invoke the getter if it exists and return the machine instance.
 * 3. Return `null` when the getter is missing or throws.
 */
export function getMachine() {
  try {
    // Prefer debugHooks channel used by tests
    const getter = debugHooks?.readDebugState?.("getClassicBattleMachine");
    const m = typeof getter === "function" ? getter() : getter;
    if (m) return m;
  } catch {}
  return null;
}

// Track current round judoka so we can compute values without card DOM
let currentPlayerJudoka = null;
let store = null;
let verboseEnabled = false;
let cooldownTimer = null;
let cooldownInterval = null;
let selectionTimer = null;
let selectionInterval = null;
let selectionFinishFn = null;
let selectionTickHandler = null;
let selectionExpiredHandler = null;
let selectionCancelled = false;
// Reentrancy guard to avoid duplicate selections/highlights in rapid inputs
let selectionApplying = false;
let quitModal = null;
let isQuitting = false;
let pausedSelectionRemaining = null;
let pausedCooldownRemaining = null;
let commandHistory = [];
let historyIndex = -1;
let historyAnchorStat = null;
let eventsWired = false;
let battleEventBindingsInstalled = false;
let removeIntentRejectionFeedback = null;
let flagsListenersWired = false;
let flagsListenerCleanupCallbacks = [];
let toggleVerboseFromFlags = null;
let applyScanlinesFromFlags = () => {};
let updateVerboseFromFlags = () => {};
const SHORTCUT_HINT_MESSAGES = {
  default:
    "Use keys 1 through 5 to choose a stat, Enter or Space to continue, H to toggle help, and Q to quit.",
  statHotkeysDisabled:
    "Stat hotkeys are disabled. Use Enter or Space to continue, H to toggle help, and Q to quit.",
  shortcutsDisabled:
    "Keyboard shortcuts are disabled. Type commands like stat 1 or stat 2 to choose a stat."
};
let controlsHintActive = false;

function getCliShortcutsEnabled() {
  try {
    return !!isEnabled("cliShortcuts");
  } catch {
    return false;
  }
}

function updateShortcutsFallback(shortcutsEnabled) {
  const fallback = byId("cli-shortcuts-disabled-hint");
  if (!fallback) return;
  const shouldShow = controlsHintActive && !shortcutsEnabled;
  fallback.hidden = !shouldShow;
  if (shouldShow) {
    fallback.removeAttribute("aria-hidden");
  } else {
    fallback.setAttribute("aria-hidden", "true");
  }
}

function handleShortcutsCloseClick(event) {
  event?.preventDefault();
  if (!state.shortcutsReturnFocus) {
    const details = byId("cli-shortcuts");
    const summary = details?.querySelector("summary");
    if (summary instanceof HTMLElement) {
      state.shortcutsReturnFocus = summary;
    }
  }
  hideCliShortcuts();
}

async function handleVerboseToggleChange() {
  const checkbox = byId("verbose-toggle");
  if (typeof toggleVerboseFromFlags === "function") {
    await toggleVerboseFromFlags(!!checkbox?.checked);
  }
}

function handleFeatureFlagsChange(event) {
  const flag = event.detail?.flag;
  if (!flag || flag === "cliVerbose") {
    try {
      verboseEnabled = !!isEnabled("cliVerbose");
    } catch {}
    const round = Number(byId("cli-root")?.dataset.round || 0);
    updateRoundHeader(round, engineFacade.getPointsToWin?.());
    updateVerboseFromFlags();
  }
  if (!flag || flag === "battleStateBadge") {
    updateStateBadgeVisibility();
  }
  if (!flag || flag === "cliShortcuts") {
    updateCliShortcutsVisibility();
    updateControlsHint();
  }
  if (!flag || flag === "statHotkeys") {
    updateControlsHint();
  }
  if (!flag || flag === "scanlines") {
    applyScanlinesFromFlags();
  }
  refreshVerboseScrollIndicators();
}

function cleanupFlagsListeners() {
  flagsListenerCleanupCallbacks.forEach((cleanup) => {
    try {
      cleanup();
    } catch {}
  });
  flagsListenerCleanupCallbacks = [];
  flagsListenersWired = false;
}

function wireFlagsListeners() {
  if (flagsListenersWired) {
    return;
  }
  const shortcutsDetails = byId("cli-shortcuts");
  if (shortcutsDetails) {
    shortcutsDetails.addEventListener("toggle", handleShortcutsToggle);
    flagsListenerCleanupCallbacks.push(() => {
      shortcutsDetails.removeEventListener("toggle", handleShortcutsToggle);
    });
  }
  const shortcutsClose = byId("cli-shortcuts-close");
  if (shortcutsClose) {
    shortcutsClose.addEventListener("click", handleShortcutsCloseClick);
    flagsListenerCleanupCallbacks.push(() => {
      shortcutsClose.removeEventListener("click", handleShortcutsCloseClick);
    });
  }
  const checkbox = byId("verbose-toggle");
  if (checkbox) {
    checkbox.addEventListener("change", handleVerboseToggleChange);
    flagsListenerCleanupCallbacks.push(() => {
      checkbox.removeEventListener("change", handleVerboseToggleChange);
    });
  }
  featureFlagsEmitter.addEventListener("change", handleFeatureFlagsChange);
  flagsListenerCleanupCallbacks.push(() => {
    featureFlagsEmitter.removeEventListener("change", handleFeatureFlagsChange);
  });
  flagsListenersWired = true;
}
// state managed in state.js

try {
  window.__battleCLIinit = Object.assign(window.__battleCLIinit || {}, {
    getEscapeHandledPromise,
    /**
     * Reset all battle CLI module-level state.
     * Used to ensure clean initialization between test runs.
     * This function serves as documentation of all state variables
     * that are specific to battle CLI operation.
     *
     * @see progressIsolation.md - Test isolation fix documentation
     * @returns {void}
     */
    __resetModuleState() {
      // Remove listeners first so test resets do not retain duplicate handlers.
      unwireEvents();

      // Clear any active timers so state resets don't leave async handlers running.
      stopSelectionCountdown();
      clearCooldownTimers();

      // Judoka and store state
      currentPlayerJudoka = null;
      store = null;

      // Settings and flags
      verboseEnabled = false;

      // Countdown state
      cooldownTimer = null;
      cooldownInterval = null;

      // Stat selection state
      selectionTimer = null;
      selectionInterval = null;
      selectionFinishFn = null;
      selectionTickHandler = null;
      selectionExpiredHandler = null;
      selectionCancelled = true;
      selectionApplying = false;

      // Modal/UI state
      quitModal = null;
      isQuitting = false;

      // Pause/resume state
      pausedSelectionRemaining = null;
      pausedCooldownRemaining = null;

      // History state
      commandHistory = [];
      historyIndex = -1;
      historyAnchorStat = null;

      // Listener state
      eventsWired = false;
      if (typeof removeIntentRejectionFeedback === "function") {
        try {
          removeIntentRejectionFeedback();
        } catch {}
      }
      removeIntentRejectionFeedback = null;
      battleEventBindingsInstalled = false;
      cleanupFlagsListeners();
      toggleVerboseFromFlags = null;
      applyScanlinesFromFlags = () => {};
      updateVerboseFromFlags = () => {};

      // Cache state
      cachedStatDefs = null;
      Object.keys(statDisplayNames).forEach((key) => {
        delete statDisplayNames[key];
      });
    },

    /**
     * Set module-scoped store for deterministic unit tests.
     *
     * @param {object|null} nextStore
     * @returns {void}
     * @pseudocode
     * if !window.__TEST__ → return
     * set module store reference to nextStore when object, else null
     */
    __setStoreForTest(nextStore) {
      if (!window.__TEST__) return;
      store = nextStore && typeof nextStore === "object" ? nextStore : null;
    },

    /**
     * Read module-scoped store for tests.
     *
     * @returns {object|null}
     * @pseudocode
     * if !window.__TEST__ → return null
     * return module store reference
     */
    __getStoreForTest() {
      if (!window.__TEST__) return null;
      return store;
    }
  });
} catch {
  // Ignore in non-browser environments where `window` is undefined
}
const statDisplayNames = {};
let cachedStatDefs = null;

function focusMainRegion() {
  const main = byId("cli-main");
  if (!main) return null;

  if (!main.hasAttribute("tabindex")) {
    main.setAttribute("tabindex", "-1");
  }

  try {
    main.focus?.();
  } catch {}

  return main;
}

function bindSkipLinkFocusTarget() {
  if (typeof document === "undefined") return;

  const skipLink = document.querySelector("a.skip-link");
  if (!skipLink || skipLink.dataset.boundSkipLink === "true") return;

  const handleSkipLinkActivate = (event) => {
    if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const main = focusMainRegion();
    if (main) {
      event.preventDefault();
    }
  };

  skipLink.dataset.boundSkipLink = "true";
  skipLink.addEventListener("click", handleSkipLinkActivate);
  skipLink.addEventListener("keydown", handleSkipLinkActivate);
}

/**
 * Ensure the CLI DOM scaffold exists for tests.
 *
 * @summary Reset the document body to the production Battle CLI structure when needed.
 * @param {{ reset?: boolean }} [options]
 * @returns {HTMLElement | null}
 * @pseudocode
 * if document undefined → return null
 * if window defined and !window.__TEST__ → throw
 * if !reset and #cli-root exists → return it
 * request a fresh CLI fragment via createCliDomFragment
 * replace document.body children with the fragment
 * clear body class & dataset
 * reveal standard scoreboard nodes to match post-init state
 * ensure countdown has remainingTime dataset
 * return #cli-root element
 */
export function ensureCliDomForTest({ reset = false } = {}) {
  if (typeof document === "undefined") return null;

  if (typeof window !== "undefined" && !window.__TEST__) {
    throw new Error("ensureCliDomForTest can only be used in test environment");
  }

  const existing = document.getElementById("cli-root");
  if (existing && !reset) {
    return existing;
  }

  const body = document.body;
  if (!body) return null;

  const fragment = createCliDomFragment(document);
  if (!fragment) return null;

  body.replaceChildren(fragment);
  body.className = "";
  normalizeShortcutCopy();
  updateControlsHint();
  ensureVerboseScrollHandling();
  try {
    const keys = Object.keys(body.dataset || {});
    for (const key of keys) {
      delete body.dataset[key];
    }
  } catch {}

  const standardNodes = document.querySelector(".standard-scoreboard-nodes");
  if (standardNodes) {
    standardNodes.style.display = "block";
    standardNodes.removeAttribute("aria-hidden");
  }

  const countdown = document.getElementById("cli-countdown");
  if (countdown && !countdown.dataset.remainingTime) {
    countdown.dataset.remainingTime = "0";
  }

  bindSkipLinkFocusTarget();

  return document.getElementById("cli-root");
}

/**
 * Resolve the active round through the orchestrator for deterministic tests.
 *
 * @param {object} [eventLike]
 * @returns {Promise<{ detail: object, dispatched: boolean, emitted: boolean }>}
 * @pseudocode
 * return resolveRoundForTestHelper(eventLike, {
 *   dispatch: detail => safeDispatch("round.evaluated", detail),
 *   emitOpponentReveal: detail => emitBattleEvent("opponentReveal", detail),
 *   emit: detail => emitBattleEvent("round.evaluated", detail),
 *   getStore: () => store
 * })
 */
async function resolveRoundForTest(eventLike = {}) {
  return resolveRoundForTestHelper(eventLike, {
    dispatch: (detail) => safeDispatch("round.evaluated", detail),
    emitOpponentReveal: (detail) => emitBattleEvent("opponentReveal", detail),
    emit: (detail) => emitBattleEvent("round.evaluated", detail),
    getStore: () => store
  });
}

/**
 * Ensure the verbose transcript section is visible for test interactions.
 *
 * @returns {void}
 * @pseudocode
 * set verboseEnabled = true
 * unhide verbose section and mark checkbox checked when available
 */
function ensureVerboseSectionForTest() {
  verboseEnabled = true;
  try {
    const checkbox = byId("verbose-toggle");
    if (checkbox) {
      checkbox.checked = true;
    }
  } catch {}
  try {
    const section = byId("cli-verbose-section");
    if (section) {
      section.hidden = false;
    }
  } catch {}
  ensureVerboseScrollHandling();
}

/**
 * Append transcript lines to the verbose log using production helpers.
 *
 * @param {Array<string|{from?: string|null, to?: string}>|string} entries
 * @returns {string[]}
 * @pseudocode
 * normalize entries into array
 * ensure verbose section visible
 * for each entry → derive from/to strings and call logStateChange(from, to)
 * collect appended text and return
 */
function appendTranscriptForTest(entries) {
  const list = Array.isArray(entries) ? entries : [entries];
  ensureVerboseSectionForTest();
  const appended = [];

  for (const entry of list) {
    if (entry === null || entry === undefined) continue;

    const { from, to } = normalizeTranscriptEntryForTest(entry);
    logStateChange(from, to);
    appended.push(to);
  }

  return appended;
}

function normalizeTranscriptEntryForTest(entry) {
  if (typeof entry === "string") {
    return { from: null, to: entry };
  }

  if (entry && typeof entry === "object") {
    const from = entry.from === undefined || entry.from === null ? null : String(entry.from);
    const target = entry.to ?? entry.text ?? entry.message ?? entry.detail ?? "";
    const to = target === null || target === undefined ? "" : String(target);
    return { from, to };
  }

  return { from: null, to: entry === null || entry === undefined ? "" : String(entry) };
}

// Test hooks to access internal timer state
export const __test = {
  ensureCliDomForTest,
  startSelectionCountdown,
  setCooldownTimers(timer, interval) {
    cooldownTimer = timer;
    cooldownInterval = interval;
  },
  getCooldownTimers() {
    return { cooldownTimer, cooldownInterval };
  },
  setSelectionTimers(timer, interval) {
    selectionTimer = timer;
    selectionInterval = interval;
  },
  getSelectionTimers() {
    return { selectionTimer, selectionInterval };
  },
  pauseTimers,
  getPausedTimes() {
    return { selection: pausedSelectionRemaining, cooldown: pausedCooldownRemaining };
  },
  setVerboseEnabled(enable) {
    verboseEnabled = !!enable;
  },
  // Expose internal finish handler for tests
  getSelectionFinishFn() {
    return selectionFinishFn;
  },
  async forceSelectionExpiry() {
    try {
      // Directly simulate expiry to make tests deterministic
      if (isEnabled("autoSelect")) {
        await autoSelectStat(selectStat, undefined, store.userJudoka?.stats);
      } else {
        emitBattleEvent("statSelectionStalled");
      }
    } catch {}
  },
  installEventBindings,
  autostartBattle,
  renderStatList,
  loadStatDefs,
  buildStatRows,
  renderHelpMapping,
  normalizeShortcutCopy,
  ensureStatClickBinding,
  restorePointsToWin,
  startRoundWrapper,
  showShortcutsPanel: showCliShortcuts,
  hideShortcutsPanel: hideCliShortcuts,
  updateCliShortcutsVisibility,
  wireEvents,
  unwireEvents,
  // Expose init for tests to manually initialize without DOMContentLoaded
  init,
  // Phase 4: Removed handleScoreboardShowMessage and handleScoreboardClearMessage exports
  // These functions have been removed as they're now handled by shared Scoreboard adapter
  handleStatSelectionStalled,
  handleCountdownStart,
  handleCountdownFinished,
  handleRoundEvaluated,
  handleMatchOver,
  handleBattleState,
  handleWaitingForPlayerActionKey,
  onClickAdvance,
  // Re-expose scoreboard message helpers for tests
  handleScoreboardShowMessage,
  handleScoreboardClearMessage,
  cli: {
    /**
     * Resolve the active round through the orchestrator for deterministic tests.
     * @param {object} [eventLike] - Event-like object with round details
     * @returns {Promise<{ detail: object, dispatched: boolean, emitted: boolean }>}
     */
    resolveRound: resolveRoundForTest,
    /**
     * Append transcript lines to the verbose log using production helpers.
     * @param {Array<string|{from?: string|null, to?: string}>|string} entries - Entries to append
     * @returns {string[]} Array of appended text
     */
    appendTranscript: appendTranscriptForTest,
    /**
     * Ensure the verbose transcript section is visible for test interactions.
     * @returns {void}
     */
    showVerboseSection: ensureVerboseSectionForTest
  }
};

let resetPromise = Promise.resolve();

/**
 * Reset the match and reinitialize the battle orchestrator.
 *
 * @pseudocode
 * stopSelectionCountdown()
 * handleCountdownFinished()
 * roundResolving = false
 * clearVerboseLog()
 * remove play-again button
 * resetPromise = async () => {
 *   disposeClassicBattleOrchestrator()
 *   await resetGame(store)
 *   updateRoundHeader(0, engineFacade.getPointsToWin?.())
 *   updateScoreLine()
 *   setRoundMessage("")
 * }
 * await initClassicBattleOrchestrator()
 * // Return a promise that resolves after both reset and orchestrator initialization are complete.
 * // Callers should await the returned promise to ensure the reset is finished.
 * @returns {Promise<void>} A promise that resolves when the reset is complete.
 */
export async function resetMatch() {
  resetBattleEventDedupeState();
  stopSelectionCountdown();
  handleCountdownFinished();
  state.roundResolving = false;
  // Clear any in-flight selection state and lingering UI highlights
  selectionApplying = false;
  clearVerboseLog();
  if (hasDocument) {
    try {
      document.getElementById("play-again-button")?.remove();
    } catch {}
  }
  // Perform synchronous UI reset to prevent glitches
  updateRoundHeader(0, engineFacade.getPointsToWin?.());
  updateScoreLine();
  setRoundMessage("");
  try {
    const announcementEl = byId("match-announcement");
    if (announcementEl) {
      announcementEl.textContent = "";
    }
  } catch {}
  try {
    const list = document.getElementById("cli-stats");
    list?.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
    list?.querySelectorAll(".cli-stat").forEach((el) => el.setAttribute("aria-selected", "false"));
    if (list && list.dataset.selectedIndex) delete list.dataset.selectedIndex;
  } catch {}
  // Re-apply seed for deterministic behavior on match reset
  initSeed();
  // Perform asynchronous reset work
  const next = (async () => {
    // Read pointsToWin from localStorage BEFORE creating new engine
    const preserveConfig = { forceCreate: true };
    const savedPoints = safeGetPointsToWinFromStorage();
    if (savedPoints.found) {
      preserveConfig.pointsToWin = savedPoints.value;
    }
    if (savedPoints.error) {
      console.warn("Failed to read pointsToWin from localStorage:", savedPoints.error);
    }

    disposeClassicBattleOrchestrator();
    await resetGame(store, preserveConfig);
  })();
  // Initialize orchestrator after sync work without blocking callers
  resetPromise = next.then(async () => {
    try {
      battleInstance = createBattleInstance();
      const orchestrator = await battleInstance.init(store, startRoundWrapper);
      if (orchestrator) {
        store.orchestrator = orchestrator;
      }
    } catch (err) {
      console.error("Failed to initialize classic battle orchestrator:", err);
      // In case of orchestrator failure, ensure we can still start battles via fallback
      try {
        emitBattleEvent("battleStateChange", { to: "waitingForMatchStart" });
      } catch {}
    }
  });
  return resetPromise;
}

/**
 * Start callback for round selection that dispatches to the state machine.
 *
 * Used to satisfy resolveRoundStartPolicy's `onStart` parameter in the CLI,
 * triggering the state machine when a round value has been selected from storage.
 */
async function startCallback() {
  // The round select modal will dispatch "startClicked" automatically when emitEvents=true,
  // so we don't need to dispatch it here. The machine should receive the event via the
  // regular event dispatcher system.
}

/**
 * Notify the battle machine that the match should start.
 *
 * @returns {Promise<void>}
 * @pseudocode
 * await resetPromise (ignore errors)
 * emit `startClicked`
 * try dispatch via debug machine
 * else try safeDispatch
 * if dispatch fails → emit battle unavailable event and show error feedback
 */
export async function triggerMatchStart() {
  try {
    await resetPromise;
  } catch {}

  try {
    emitBattleEvent("startClicked");
  } catch {}

  try {
    const getter = debugHooks?.readDebugState?.("getClassicBattleMachine");
    const machine = typeof getter === "function" ? getter() : getter;
    if (machine?.dispatch) {
      await machine.dispatch("startClicked");
      return;
    }
  } catch {}

  let dispatched = false;
  let dispatchFailure = null;
  try {
    const result = await safeDispatch("startClicked");
    dispatched = result?.ok === true;
    dispatchFailure = result?.ok === true ? null : result;
  } catch (error) {
    dispatched = false;
    dispatchFailure = {
      ok: false,
      eventName: "startClicked",
      reason: "dispatch_exception",
      error: error instanceof Error ? error : new Error(String(error))
    };
  }

  if (dispatched) {
    return;
  }

  try {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CLI] Orchestrator unavailable; start action rejected");
    }
    emitBattleEvent("battle.unavailable", {
      action: "startClicked",
      reason: dispatchFailure?.reason || "no_machine",
      error: dispatchFailure?.error || null
    });
  } catch (err) {
    console.debug("Failed to dispatch startClicked", err);
  }
}

/**
 * Render unavailable-battle feedback without mutating battle state.
 *
 * @param {CustomEvent} event - Battle unavailable event.
 * @returns {void}
 * @pseudocode
 * 1. Read action/reason from event detail.
 * 2. Mark countdown region with an error message when available.
 * 3. Show snackbar guidance to retry or reset.
 */
function handleBattleUnavailable(event) {
  const detail = event?.detail || {};
  const action = detail.action || "action";
  const reason = detail.reason || "no_machine";
  const countdown = byId("cli-countdown");
  if (countdown) {
    countdown.textContent = "Battle unavailable. Press R to reset.";
    countdown.dataset.status = "error";
  }
  showSnackbar(`Battle unavailable (${action}: ${reason}). Press R to reset.`);
}

/**
 * Announce that the match is ready to begin.
 *
 * @param {{ focusMain?: boolean }} [options]
 * @returns {Promise<void>}
 * @pseudocode
 * await resetPromise (ignore errors)
 * if no document → return
 * call showSnackbar with "Press Enter to start the match."
 * if focusMain → focus #cli-main (ensure tabindex)
 */
export async function announceMatchReady({ focusMain = false } = {}) {
  try {
    await resetPromise;
  } catch {}

  if (!hasDocument) return;

  try {
    showSnackbar("Press Enter to start the match.");
  } catch {}

  if (!focusMain) return;

  try {
    const main = byId("cli-main");
    if (!main) return;
    if (!main.hasAttribute("tabindex")) {
      main.setAttribute("tabindex", "-1");
    }
    if (typeof window === "undefined" || !window.__TEST__) {
      main.focus?.();
    }
  } catch {}
}

/**
 * Initialize deterministic seed input and validation.
 *
 * @pseudocode
 * read seed query param and localStorage
 * define apply(n): enable test mode and persist n
 * if query param numeric: apply and set input
 * else if stored seed numeric: populate input
 * on input change:
 *   if value empty or NaN:
 *     clear input, show error, disable test mode, remove stored seed
 *   else:
 *     clear error and apply value
 */
function initSeed() {
  const input = byId("seed-input");
  const errorEl = byId("seed-error");
  let seedParam = null;
  let storedSeed = null;
  try {
    const params = new URLSearchParams(window.location.search);
    seedParam = params.get("seed");
    storedSeed = localStorage.getItem("battleCLI.seed");
  } catch {}
  const apply = (n) => {
    setTestMode({ enabled: true, seed: n });
    try {
      localStorage.setItem("battleCLI.seed", String(n));
    } catch {}
  };
  // Only auto-enable test mode when an explicit seed query param is provided.
  if (seedParam !== null && seedParam !== "") {
    const num = Number(seedParam);
    if (!Number.isNaN(num)) {
      apply(num);
      if (input) input.value = String(num);
    }
  } else if (storedSeed) {
    const num = Number(storedSeed);
    if (!Number.isNaN(num)) {
      // Apply stored seed to the engine for persistence.
      apply(num);
      if (input) input.value = String(num);
    }
  }
  input?.addEventListener("input", () => {
    const val = Number(input.value);
    if (input.value.trim() === "" || Number.isNaN(val)) {
      input.value = "";
      if (errorEl) errorEl.textContent = "Invalid seed. Using default.";
      setTestMode({ enabled: false });
      try {
        localStorage.removeItem("battleCLI.seed");
      } catch {}
      return;
    }
    if (errorEl) errorEl.textContent = "";
    apply(val);
  });
}

/**
 * Show or hide the battle state badge based on feature flag.
 *
 * @pseudocode
 * if badge element exists:
 *   set hidden to !isEnabled("battleStateBadge")
 */
function updateStateBadgeVisibility() {
  const badge = byId("battle-state-badge");
  if (badge) badge.style.display = isEnabled("battleStateBadge") ? "" : "none";
}

/**
 * Show or hide the CLI shortcuts section based on feature flag.
 *
 * @pseudocode
 * get shortcuts section; return if missing
 * if flag disabled:
 *   mark section.dataset.hiddenByCliShortcutsFlag
 *   force display:none so the panel cannot stay open
 *   if overlay currently visible -> hideCliShortcuts()
 * else:
 *   clear dataset.hiddenByCliShortcutsFlag marker
 *   reset display override
 *   read persisted collapse state from localStorage
 *   if persisted state differs from current DOM state -> toggle via show/hide helpers
 */
function updateCliShortcutsVisibility() {
  const section = byId("cli-shortcuts");
  if (!section) return;

  let persistedCollapsed = null;
  try {
    const stored = localStorage.getItem("battleCLI.shortcutsCollapsed");
    if (stored === "0") {
      persistedCollapsed = false;
    } else if (stored === "1") {
      persistedCollapsed = true;
    }
  } catch (error) {
    console.debug("localStorage access failed for shortcuts state:", error?.message || error);
  }

  const enabled = isEnabled("cliShortcuts");
  if (!enabled) {
    const wasOpen = section.open;
    if (section.open) {
      setDetailsOpen(section, false);
    }
    section.hidden = true;
    if (persistedCollapsed === false || wasOpen) {
      try {
        localStorage.setItem("battleCLI.shortcutsCollapsed", "1");
      } catch {}
    }
    updateShortcutsFallback(enabled);
    updateControlsHint();
    return;
  }

  section.hidden = false;

  const shouldBeOpen = persistedCollapsed === null ? false : persistedCollapsed === false;

  if (shouldBeOpen !== section.open) {
    setDetailsOpen(section, shouldBeOpen);
  }
  updateShortcutsFallback(enabled);
  updateControlsHint();
}

/**
 * Expand the CLI shortcuts panel.
 *
 * @pseudocode
 * show shortcuts section and body
 * allow the native toggle event to persist expanded state to localStorage
 * set state.shortcutsOverlay = true to track that overlay is active
 */
function showCliShortcuts() {
  const sec = byId("cli-shortcuts");
  if (sec) {
    setDetailsOpen(sec, true);
    sec.hidden = false;
    state.shortcutsOverlay = true;
    // Ensure toggle event is fired for listeners (test environments may not fire it automatically)
    try {
      const toggleEvent = new Event("toggle", { bubbles: false });
      sec.dispatchEvent(toggleEvent);
    } catch {}
  }
}

/**
 * Collapse the CLI shortcuts panel and restore focus.
 *
 * @pseudocode
 * hide shortcuts section and body
 * persist collapsed state to localStorage via the native toggle event
 * if stored focus exists: focus it and clear reference
 * set state.shortcutsOverlay = null to track that overlay is closed
 */
function hideCliShortcuts() {
  const sec = byId("cli-shortcuts");
  if (sec) {
    setDetailsOpen(sec, false);
    // Restore focus before clearing the reference
    try {
      state.shortcutsReturnFocus?.focus();
    } catch {}
    state.shortcutsReturnFocus = null;
    state.shortcutsOverlay = null;
    // Ensure toggle event is fired for listeners (test environments may not fire it automatically)
    try {
      const toggleEvent = new Event("toggle", { bubbles: false });
      sec.dispatchEvent(toggleEvent);
    } catch {}
  }
}

function showBottomLine(text) {
  // Use shared showSnackbar for consistent stacking behavior
  showSnackbar(text || "");
}

/**
 * Sanitize snackbar hint text to avoid DOM injection.
 *
 * @param {unknown} text
 * @returns {string}
 * @pseudocode
 * if text not string: return ""
 * return text stripped of non-printable characters and trimmed to 200 chars
 */
function sanitizeHintText(text) {
  if (typeof text !== "string") return "";
  return text.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "").slice(0, 200);
}

/**
 * Display a short-lived snackbar hint without clearing the countdown.
 * Now uses shared showSnackbar() helper for consistent stacking behavior.
 *
 * @pseudocode
 * call showSnackbar(sanitized message)
 * shared helper handles queueing, stacking, and auto-dismiss
 *
 * @param {string} text - Hint text to display.
 */
function showHint(text) {
  showSnackbar(sanitizeHintText(text));
}

/**
 * Ensure a container exists for modal dialogs.
 *
 * @pseudocode
 * el = document.getElementById("modal-container")
 * if el missing:
 *   create div#modal-container and append to body
 * return el
 *
 * @returns {HTMLElement} Modal container element.
 */
function ensureModalContainer() {
  if (!hasDocument) return null;
  let el = byId("modal-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "modal-container";
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Clear a timer pair and capture remaining time.
 *
 * @param {"selection"|"roundWait"} type Timer category to pause.
 * @returns {number|null} Remaining seconds, or null when no timers were active.
 *
 * @pseudocode
 * if pausing selection:
 *   clear selection timeout and interval
 *   read remaining from countdown dataset
 *   null selection timers
 * else:
 *   clear cooldown timeout and interval
 *   parse remaining from snackbar text
 *   null cooldown timers
 * return remaining or null
 */
function pauseTimer(type) {
  const isSelection = type === "selection";
  const timer = isSelection ? selectionTimer : cooldownTimer;
  const interval = isSelection ? selectionInterval : cooldownInterval;
  if (!timer && !interval) return null;
  try {
    if (timer) {
      if (typeof timer.stop === "function") {
        timer.stop();
      } else {
        clearTimeout(timer);
      }
    }
  } catch {}
  try {
    if (interval) clearInterval(interval);
  } catch {}
  if (isSelection) {
    const countdown = byId("cli-countdown");
    const remaining = Number(countdown?.dataset?.remainingTime) || null;
    selectionTimer = null;
    selectionInterval = null;
    return remaining;
  } else {
    cooldownTimer = null;
    cooldownInterval = null;
    const countdown = byId("cli-countdown");
    const remaining = Number(countdown?.dataset?.remainingTime);
    return Number.isFinite(remaining) && remaining > 0 ? remaining : null;
  }
}

/**
 * Pause active selection and cooldown timers, preserving remaining time.
 *
 * @pseudocode
 * newSelection = pauseTimer("selection")
 * if newSelection is not null:
 *   pausedSelectionRemaining = newSelection
 * newCooldown = pauseTimer("roundWait")
 * if newCooldown is not null:
 *   pausedCooldownRemaining = newCooldown
 */
function pauseTimers() {
  console.log("[TIMER] pauseTimers called");
  const newSelection = pauseTimer("selection");
  if (newSelection !== null) pausedSelectionRemaining = newSelection;
  const newCooldown = pauseTimer("roundWait");
  if (newCooldown !== null) pausedCooldownRemaining = newCooldown;
}

/**
 * Resume timers previously paused by `pauseTimers`.
 *
 * @pseudocode
 * if in roundSelect and have selection remaining:
 *   startSelectionCountdown(remaining)
 * if in roundWait and have cooldown remaining:
 *   show bottom line and start interval/timeout
 * reset stored remaining values
 */
function resumeTimers() {
  if (!hasDocument) return;
  console.log("[TIMER] resumeTimers called");
  if (document.body?.dataset?.battleState === "roundSelect" && pausedSelectionRemaining) {
    startSelectionCountdown(pausedSelectionRemaining);
  }
  if (document.body?.dataset?.battleState === "roundWait" && pausedCooldownRemaining) {
    renderRoundWaitCountdown(pausedCooldownRemaining);
  }
  pausedSelectionRemaining = null;
  pausedCooldownRemaining = null;
}

/**
 * Render cooldown countdown text from authoritative event payloads.
 *
 * @param {number} remainingSeconds
 * @returns {void}
 */
function renderRoundWaitCountdown(remainingSeconds) {
  const normalized = Math.max(0, Math.round(Number(remainingSeconds) || 0));
  const countdown = byId("cli-countdown");
  if (countdown) {
    countdown.dataset.remainingTime = String(normalized);
    if (countdown.dataset.status !== "error") {
      countdown.textContent = normalized > 0 ? `Next round in: ${normalized}` : "";
    }
  }
  showBottomLine(normalized > 0 ? `Next round in: ${normalized}` : "");
}

/**
 * Clear cooldown countdown text when an authoritative end event is emitted.
 *
 * @returns {void}
 */
function clearRoundWaitCountdown() {
  const countdown = byId("cli-countdown");
  if (countdown) {
    delete countdown.dataset.remainingTime;
    if (countdown.dataset.status !== "error") {
      countdown.textContent = "";
    }
  }
  clearBottomLine();
}

/**
 * Handle cooldown timer tick payloads from core orchestration.
 *
 * @param {CustomEvent<{remaining?: number, secondsRemaining?: number, remainingMs?: number}>} e
 * @returns {void}
 */
function handleCooldownTimerTick(e) {
  if (document.body?.dataset?.battleState !== "roundWait") return;
  const fromSeconds = Number(e?.detail?.secondsRemaining);
  const fromRemaining = Number(e?.detail?.remaining);
  const fromMs = Number(e?.detail?.remainingMs);
  const remaining = Number.isFinite(fromSeconds)
    ? fromSeconds
    : Number.isFinite(fromRemaining)
      ? fromRemaining
      : Number.isFinite(fromMs)
        ? Math.ceil(fromMs / 1000)
        : NaN;
  if (!Number.isFinite(remaining)) return;
  renderRoundWaitCountdown(remaining);
}

/**
 * Build and display a quit confirmation modal.
 *
 * @pseudocode
 * pauseTimers()
 * if modal not yet created:
 *   build modal with Cancel and Quit buttons
 *   listen for modal 'close' to resume timers when not quitting
 *   cancel closes modal
 *   quit sets quitting flag, dispatches interrupt and clears bottom line
 *   after interrupt resolves: navigate to lobby
 *   append modal to container
 * open modal
 */
function showQuitModal() {
  if (!hasDocument) return;
  pauseTimers();
  isQuitting = false;
  if (!quitModal) {
    const title = document.createElement("h2");
    title.id = "quit-modal-title";
    title.textContent = "Quit the match?";

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const cancel = createButton("Cancel", {
      id: "cancel-quit-button",
      className: "secondary-button"
    });
    const quit = createButton("Quit", { id: "confirm-quit-button" });
    actions.append(cancel, quit);

    const frag = document.createDocumentFragment();
    frag.append(title, actions);

    quitModal = createModal(frag, { labelledBy: title });
    quitModal.element.addEventListener("close", () => {
      if (!isQuitting) resumeTimers();
    });
    cancel.addEventListener("click", () => {
      quitModal.close();
    });
    quit.addEventListener("click", async () => {
      isQuitting = true;
      quitModal.close();
      clearBottomLine();
      // Maintain backward-compat: first dispatch interrupt expected by tests/UI,
      // then optionally emit dedicated quit for future handlers.
      try {
        await safeDispatch("interrupt", { reason: "quit" });
      } catch {}
      try {
        await safeDispatch("quit", { reason: "userQuit" });
      } catch {}
      try {
        // Use a relative path so deployments under a subpath (e.g. GitHub Pages)
        // navigate back to the lobby correctly.
        window.location.href = "../../index.html";
      } catch {}
    });
    ensureModalContainer().appendChild(quitModal.element);
  }
  quitModal.open();
}

function clearBottomLine() {
  showBottomLine("");
}

/**
 * Clear active stat selection countdown timers and reset the countdown UI.
 *
 * @pseudocode
 * if timer exists: clearTimeout(timer)
 * if interval exists: clearInterval(interval)
 * null timers and remove countdown text/attribute
 */
function stopSelectionCountdown() {
  // Prefer silent cancel path for roundTimer-based countdown
  try {
    selectionCancelled = true;
    if (selectionTimer && typeof selectionTimer.off === "function") {
      if (selectionTickHandler) selectionTimer.off("tick", selectionTickHandler);
      if (selectionExpiredHandler) selectionTimer.off("expired", selectionExpiredHandler);
    }
  } catch {}
  // Legacy clears for fallback paths
  try {
    if (selectionTimer && typeof selectionTimer === "number") clearTimeout(selectionTimer);
  } catch {}
  try {
    if (selectionInterval) clearInterval(selectionInterval);
  } catch {}
  selectionTimer = null;
  selectionInterval = null;
  const el = byId("cli-countdown");
  if (el) {
    delete el.dataset.status;
    // Respect any short-lived UI freeze requested by the outer CLI helper
    try {
      const freezeUntil = window.__battleCLIinit?.__freezeUntil || 0;
      if (freezeUntil && Date.now() < freezeUntil) {
        return;
      }
    } catch {}
    el.textContent = "";
    delete el.dataset.remainingTime;
  }
}

/**
 * Clear a timer stored on the given object.
 *
 * @param {object} store
 * @param {string} timerProperty
 * @pseudocode
 * if store?[timerProperty]
 *   try clearTimeout and clearInterval on store[timerProperty]
 *   catch log error
 * set store[timerProperty] = null
 */
function clearStoreTimer(store, timerProperty) {
  if (!store) return;
  try {
    const timerId = store[timerProperty];
    if (timerId) {
      clearTimeout(timerId);
      clearInterval(timerId);
    }
  } catch (err) {
    console.error(`Failed to clear ${timerProperty}`, err);
  }
  store[timerProperty] = null;
}

function recordCommandHistory(stat) {
  if (!stat) return;
  try {
    const history = JSON.parse(localStorage.getItem("cliStatHistory") || "[]");
    const list = Array.isArray(history) ? history : [];
    if (list[list.length - 1] !== stat) {
      list.push(stat);
      if (list.length > 20) {
        list.shift();
      }
      localStorage.setItem("cliStatHistory", JSON.stringify(list));
      console.log("[DEBUG selectStat] Updated commandHistory:", list);
    }
    commandHistory = list;
    historyIndex = commandHistory.length;
  } catch {}
}

/**
 * Apply the chosen stat and notify the state machine.
 *
 * @param {string} stat Stat key chosen by the player.
 * @returns {void}
 * @pseudocode
 * stopSelectionCountdown()
 * clear pending selection timers and auto-select callbacks
 * highlight chosen stat
 * update store with selection
 * show bottom line with picked stat
 * set `roundResolving`
 * dispatch "statSelected" on machine
 */
export async function selectStat(stat) {
  // DEBUG: Log to localStorage so we can trace execution
  try {
    const logs = JSON.parse(localStorage.getItem("__DEBUG_SELECT_STAT_LOG") || "[]");
    logs.push(
      `${new Date().toISOString()}: selectStat called with stat=${stat}, TEST=${window.__TEST__}, selectionApplying=${selectionApplying}, roundResolving=${state.roundResolving}`
    );
    if (logs.length > 50) logs.shift();
    localStorage.setItem("__DEBUG_SELECT_STAT_LOG", JSON.stringify(logs));
  } catch {}

  if (!stat) return;
  // Ignore additional selections once a choice has already been committed.
  if (store?.selectionMade) return;
  // Ignore re-entrant calls while a selection is being applied.
  if (selectionApplying) return;
  clearHistoryPreview({ restoreAnchor: false });
  selectionApplying = true;
  stopSelectionCountdown();
  clearStoreTimer(store, "statTimeoutId");
  clearStoreTimer(store, "autoSelectId");
  const list = byId("cli-stats");
  list?.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
  list?.querySelectorAll(".cli-stat").forEach((el) => el.setAttribute("aria-selected", "false"));
  const idx = STATS.indexOf(stat) + 1;
  if (list) list.dataset.selectedIndex = String(idx);
  const choiceEl = list?.querySelector(`[data-stat-index="${idx}"]`);
  choiceEl?.classList.add("selected");
  choiceEl?.setAttribute("aria-selected", "true");

  // Move focus to the stat list for accessibility
  if (list) {
    const activeElement = getActiveElement();
    if (!list.contains(activeElement)) {
      list.focus();
    }
  }

  try {
    if (store) {
      store.playerChoice = stat;
      store.selectionMade = true;
    }
  } catch (err) {
    console.error("Failed to update player choice", err);
  }
  try {
    const history = JSON.parse(localStorage.getItem("cliStatHistory") || "[]");
    console.log("[DEBUG selectStat] Before update - history:", history, "stat:", stat);
  } catch {}
  recordCommandHistory(stat);
  showBottomLine(`You Picked: ${stat.charAt(0).toUpperCase()}${stat.slice(1)}`);
  try {
    state.roundResolving = true;
    // Dispatch the statSelected event to the state machine and emit the battle event
    emitBattleEvent("statSelected", { stat });
    await Promise.resolve(safeDispatch("statSelected"));
  } catch (err) {
    console.error("Error dispatching statSelected", err);
  } finally {
    // Allow future selections only after dispatch settles (success or failure).
    selectionApplying = false;
  }
}

/**
 * Start a countdown for stat selection and handle expiry.
 *
 * @param {number} [seconds=30] - Countdown duration in whole seconds.
 * @returns {void}
 * @pseudocode
 * stopSelectionCountdown()
 * set remaining=seconds and update countdown element
 * every 1s: decrement remaining and update element
 * after seconds: stop countdown and
 *   if autoSelect enabled: autoSelectStat(selectStat)
 *   else emit "statSelectionStalled"
 */
export function startSelectionCountdown(seconds = 30) {
  const el = byId("cli-countdown");
  if (!el) return;
  stopSelectionCountdown();
  const normalizedSeconds = (() => {
    try {
      const overrideSeconds = Number(
        (typeof window !== "undefined" && window.__FF_OVERRIDES?.selectionCountdownSeconds) ??
          seconds
      );

      if (Number.isFinite(overrideSeconds) && overrideSeconds > 0) {
        return Math.max(1, Math.round(overrideSeconds));
      }
    } catch {}

    return seconds;
  })();

  let remaining = normalizedSeconds;
  const finish = async () => {
    if (selectionCancelled) return;
    // Clear UI and cancel any residual listeners
    stopSelectionCountdown();
    try {
      if (isEnabled("autoSelect")) {
        await autoSelectStat(selectStat, undefined, store.userJudoka?.stats);
      } else {
        emitBattleEvent("statSelectionStalled");
      }
    } catch {}
  };
  selectionFinishFn = finish;
  /**
   * Apply countdown text while respecting existing error messaging.
   *
   * @param {number} value - The remaining countdown seconds to display.
   * @pseudocode
   * set el.dataset.remainingTime to String(value)
   * if el.dataset.status is "error": return
   * set el.textContent to formatted countdown message
   */
  const applyCountdownText = (value) => {
    el.dataset.remainingTime = String(value);
    if (el.dataset.status === "error") return;
    el.textContent = `Time remaining: ${value}`;
    if (value < 5) {
      el.style.color = "#ffcc00";
    } else {
      el.style.color = "";
    }
  };
  // Render initial
  if (typeof window !== "undefined" && window.__battleCLIinit?.setCountdown) {
    window.__battleCLIinit.setCountdown(remaining);
  } else {
    applyCountdownText(remaining);
  }
  // Create and wire a round timer so tests behave consistently
  try {
    const timer = createRoundTimer();
    selectionCancelled = false;
    // We don't rely on timer tick for UI; maintain a local interval for deterministic updates
    selectionTickHandler = null;
    selectionExpiredHandler = () => {
      if (selectionCancelled) return;
      finish();
    };
    timer.on("expired", selectionExpiredHandler);
    selectionTimer = timer;
    timer.start(remaining);
    // Mirror countdown UI via JS interval for reliability in tests
    selectionInterval = setInterval(() => {
      if (selectionCancelled) return;
      remaining -= 1;
      if (remaining > 0) {
        if (typeof window !== "undefined" && window.__battleCLIinit?.setCountdown) {
          window.__battleCLIinit.setCountdown(remaining);
        } else {
          applyCountdownText(remaining);
        }
      }
    }, 1000);
  } catch {
    // As a last resort, run finish to avoid stalling
    finish();
  }
}

/**
 * Auto-start the battle when the URL indicates `autostart=1`.
 *
 * @pseudocode
 * 1. Ensure `autostart=1` is present in the URL to persist intent.
 * 2. If present, dispatch `startClicked` on the battle machine.
 *
 * @returns {void}
 */
export function autostartBattle() {
  // Persist `autostart=1` so the CLI skips the modal
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("autostart") !== "1") {
      url.searchParams.set("autostart", "1");
      history.replaceState({}, "", url);
    }
  } catch {}
  // Dispatch start automatically when autostart is enabled
  try {
    const autostart = new URLSearchParams(location.search).get("autostart");
    if (autostart === "1") {
      triggerMatchStart();
    }
  } catch {}
}

/**
 * Activate a stat row and update roving focus.
 *
 * @pseudocode
 * 1. Retrieve `#cli-stats`; abort if list or row missing.
 * 2. Set `tabIndex` 0 on the row and -1 on others.
 * 3. Ensure the row has an `id` and mirror it to `aria-activedescendant`.
 * 4. Focus the row when `focus` is true.
 *
 * @param {HTMLElement} row - The stat row to activate.
 * @param {object} [options] - Options for activation.
 * @param {boolean} [options.focus=true] - Whether to move focus to the row.
 * @returns {void}
 */
function setActiveStatRow(row, { focus = true } = {}) {
  const list = byId("cli-stats");
  if (!list || !row) return;
  const rows = Array.from(list.querySelectorAll(".cli-stat"));
  rows.forEach((el) => {
    el.tabIndex = el === row ? 0 : -1;
    el.setAttribute("aria-selected", el === row ? "true" : "false");
  });
  if (!row.id) {
    row.id = `cli-stat-${row.dataset.statIndex || rows.indexOf(row) + 1}`;
  }
  list.setAttribute("aria-activedescendant", row.id);
  if (focus) row.focus();
}

/**
 * Handle arrow-key navigation within the stat list.
 *
 * @pseudocode
 * 1. Collect all stat rows; bail if none exist.
 * 2. Determine the current row; default based on key if none.
 * 3. Adjust index by direction, wrapping with modulo.
 * 4. Activate the new row and report handled.
 *
 * @param {"ArrowUp"|"ArrowDown"|"ArrowLeft"|"ArrowRight"} key - Pressed arrow key.
 * @returns {boolean} Whether the key was handled.
 */
export function handleStatListArrowKey(key) {
  clearHistoryPreview({ restoreAnchor: false });
  const list = byId("cli-stats");
  const rows = list ? Array.from(list.querySelectorAll(".cli-stat")) : [];
  if (!list || rows.length === 0) return false;
  const activeElement = getActiveElement();
  const current = activeElement?.closest?.(".cli-stat") ?? null;
  let idx = rows.indexOf(current);
  if (idx === -1) {
    idx = key === "ArrowUp" || key === "ArrowLeft" ? rows.length - 1 : 0;
  } else {
    const delta = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1;
    idx = (idx + delta + rows.length) % rows.length;
  }
  setActiveStatRow(rows[idx]);
  return true;
}

/**
 * Load stat definitions once and return them.
 *
 * @pseudocode
 * 1. If no cache, attempt to fetch `statNames.json` via `fetchJson`.
 * 2. On failure or empty result, fall back to local `statNamesData`.
 * 3. Return the cached definitions array or an empty array.
 *
 * @returns {Promise<Array>} Cached stat definition objects.
 */
async function loadStatDefs() {
  // In test environments we prefer to honour the test's fetchJson mock and
  // avoid reusing a module-level cache which can leak state between tests.
  // Outside tests, keep the original caching behaviour for performance.
  if (typeof window !== "undefined" && window.__TEST__) {
    try {
      const fetched = await fetchJson("statNames.json");
      if (Array.isArray(fetched) && fetched.length) {
        return fetched;
      }
    } catch {}
    return Array.isArray(statNamesData) ? statNamesData : [];
  }

  if (!cachedStatDefs) {
    try {
      const fetched = await fetchJson("statNames.json");
      if (Array.isArray(fetched) && fetched.length) {
        cachedStatDefs = fetched;
      } else {
        cachedStatDefs = statNamesData;
      }
    } catch {
      cachedStatDefs = statNamesData;
    }
  }
  return Array.isArray(cachedStatDefs) ? cachedStatDefs : [];
}

/**
 * Build DOM rows for stats and return them.
 *
 * @pseudocode
 * 1. Sort stats by `statIndex` and iterate.
 * 2. Map `STATS` entry to display name cache.
 * 3. Create a row per stat, including value when provided.
 *
 * @param {Array} stats - Stat definition objects.
 * @param {object} [judoka] - Optional judoka with current stat values.
 * @returns {Array<HTMLElement>} Array of constructed row elements.
 */
function buildStatRows(stats, judoka) {
  if (!hasDocument) return [];
  const rows = [];
  stats
    .slice()
    .sort((a, b) => (a.statIndex || 0) - (b.statIndex || 0))
    .forEach((s) => {
      const idx = Number(s.statIndex) || 0;
      if (!idx) return;
      const key = STATS[idx - 1];
      const div = document.createElement("div");
      if (key) {
        statDisplayNames[key] = s.name;
        // Provide semantic identification for automation and accessibility helpers.
        div.dataset.stat = key;
      }
      div.className = "cli-stat";
      div.id = `cli-stat-${idx}`;
      div.setAttribute("role", "option");
      div.setAttribute("tabindex", "-1");
      div.setAttribute("aria-selected", "false");
      div.dataset.statIndex = String(idx);
      const val = Number(judoka?.stats?.[key]);
      div.textContent = Number.isFinite(val) ? `[${idx}] ${s.name}: ${val}` : `[${idx}] ${s.name}`;
      div.setAttribute(
        "aria-label",
        Number.isFinite(val) ? `Select ${s.name} with value ${val}` : `Select ${s.name}`
      );
      rows.push(div);
    });
  return rows;
}

/**
 * Populate the help mapping with stat index→name references.
 *
 * @pseudocode
 * 1. Locate `#cli-help`; bail if missing or already populated.
 * 2. Build mapping string from sorted stats and append as list item.
 *
 * @param {Array} stats - Stat definition objects.
 * @returns {void}
 */
function renderHelpMapping(stats) {
  if (!hasDocument) return;
  try {
    const help = byId("cli-help");
    if (!help) {
      console.error("renderHelpMapping: #cli-help element missing");
      return;
    }
    if (help.childElementCount !== 0) return;
    const mapping = stats
      .slice()
      .sort((a, b) => (a.statIndex || 0) - (b.statIndex || 0))
      .map((s) => `[${s.statIndex}] ${s.name}`)
      .join("  ·  ");
    const li = document.createElement("li");
    li.textContent = mapping;
    help.appendChild(li);
  } catch (err) {
    console.error("renderHelpMapping failed", err);
  }
}

/**
 * Ensure shortcut hint copy uses the en dash variant for the stat range.
 *
 * @pseudocode
 * help = #cli-help → replace `[1-5]` tokens in first item with `[1–5]`
 * hint = #cli-controls-hint → replace `[1-5]` tokens with `[1–5]`
 * gracefully ignore missing nodes
 *
 * @returns {void}
 */
function normalizeShortcutCopy() {
  const replaceRangeToken = (value) =>
    typeof value === "string" ? value.replace(/\[1-5\]/g, "[1–5]") : value;

  const help = byId("cli-help");
  if (help) {
    const firstItem = help.querySelector("li");
    if (firstItem) {
      const originalText = firstItem.textContent ?? "";
      const normalizedText = replaceRangeToken(originalText);
      if (normalizedText !== originalText) {
        firstItem.textContent = normalizedText;
      }
    }
  }

  const rangeKey = byId("cli-controls-key-range");
  if (rangeKey) {
    rangeKey.textContent = "1–5";
  }

  const hint = byId("cli-controls-hint");
  if (hint) {
    const doc = hint.ownerDocument;
    if (doc?.createTreeWalker) {
      const walker = doc.createTreeWalker(
        hint,
        typeof NodeFilter !== "undefined" ? NodeFilter.SHOW_TEXT : 4
      );
      let node = walker.nextNode();
      while (node) {
        const originalValue = node.nodeValue ?? "";
        const normalizedValue = replaceRangeToken(originalValue);
        if (normalizedValue !== originalValue) {
          node.nodeValue = normalizedValue;
        }
        node = walker.nextNode();
      }
    } else {
      const originalText = hint.textContent ?? "";
      const normalizedText = replaceRangeToken(originalText);
      if (normalizedText !== originalText) {
        hint.textContent = normalizedText;
      }
    }
  }
}

function updateControlsHint() {
  const hint = byId("cli-controls-hint");
  let shortcutsEnabled = false;
  let statHotkeysEnabled = false;
  try {
    shortcutsEnabled = !!isEnabled("cliShortcuts");
  } catch {}
  try {
    statHotkeysEnabled = !!isEnabled("statHotkeys");
  } catch {}

  if (hint) {
    const items = hint.querySelectorAll(".cli-controls-hint__item");
    items.forEach((item) => {
      const requires = (item.dataset.requires || "").trim();
      const deps = requires ? requires.split(/\s+/) : [];
      const satisfied = deps.every((dep) => {
        if (dep === "cliShortcuts") return shortcutsEnabled;
        if (dep === "statHotkeys") return statHotkeysEnabled;
        return true;
      });
      if (satisfied) {
        item.classList.remove("cli-controls-hint__item--disabled");
        item.removeAttribute("aria-disabled");
      } else {
        item.classList.add("cli-controls-hint__item--disabled");
        item.setAttribute("aria-disabled", "true");
      }
    });
  }

  const sr = byId("cli-controls-hint-announce");
  if (sr) {
    if (!shortcutsEnabled) {
      sr.textContent = SHORTCUT_HINT_MESSAGES.shortcutsDisabled;
    } else if (!statHotkeysEnabled) {
      sr.textContent = SHORTCUT_HINT_MESSAGES.statHotkeysDisabled;
    } else {
      sr.textContent = SHORTCUT_HINT_MESSAGES.default;
    }
  }
  updateShortcutsFallback(shortcutsEnabled);
}

/**
 * Ensure stat list has a click handler bound once.
 *
 * @pseudocode
 * 1. Track bound list elements in a WeakSet.
 * 2. Bind the click handler only when the list isn't already bound.
 *
 * @param {HTMLElement} list - Stats list element.
 * @returns {void}
 */
function handleStatListClick(event) {
  const list = byId("cli-stats");
  const statDiv = event.target?.closest?.(".cli-stat");
  if (statDiv && list?.contains(statDiv)) {
    setActiveStatRow(statDiv);
    handleStatClick(statDiv, event);
  }
}

function handleStatClick(statDiv, event) {
  // DEBUG: Log state checks
  try {
    const doc = getSafeDocument();
    const stateValue = doc?.body?.dataset?.battleState ?? "";
    const logs = JSON.parse(localStorage.getItem("__DEBUG_HANDLE_STAT_CLICK") || "[]");
    logs.push(`handleStatClick: state=${stateValue}, statDiv=${statDiv?.dataset?.stat}`);
    if (logs.length > 50) logs.shift();
    localStorage.setItem("__DEBUG_HANDLE_STAT_CLICK", JSON.stringify(logs));
  } catch {}

  event.preventDefault();
  const idx = statDiv?.dataset?.statIndex;
  if (!idx) return;
  const doc = getSafeDocument();
  const state = doc?.body?.dataset?.battleState ?? "";
  if (state !== "roundSelect") return;
  const stat = getStatByIndex(idx);
  if (!stat) return;
  selectStat(stat);
}

function ensureStatClickBinding(list) {
  const onClick = handleStatListClick;
  const boundTargets = (globalThis.__battleCLIStatListBoundTargets ||= new WeakSet());
  if (!boundTargets.has(list)) {
    list.addEventListener("click", onClick);
    boundTargets.add(list);
  }
}

function getStatRowByKey(stat) {
  if (!stat) return null;
  const list = byId("cli-stats");
  if (!list) return null;
  return list.querySelector(`.cli-stat[data-stat="${stat}"]`);
}

function captureHistoryAnchorStat() {
  const list = byId("cli-stats");
  if (!list) return null;
  const selected = list.querySelector(".cli-stat.selected[data-stat]");
  if (selected?.dataset?.stat) return selected.dataset.stat;
  const activeId = list.getAttribute("aria-activedescendant");
  if (activeId) {
    const active = byId(activeId);
    if (active?.dataset?.stat) return active.dataset.stat;
  }
  const focused = getActiveElement()?.closest?.(".cli-stat");
  return focused?.dataset?.stat ?? null;
}

function applyHistoryPreview(stat) {
  const list = byId("cli-stats");
  if (!list) return;
  const previous = list.querySelector(".history-preview");
  if (previous) {
    previous.classList.remove("history-preview");
  }
  if (!stat) {
    delete list.dataset.historyPreview;
    return;
  }
  const row = getStatRowByKey(stat);
  if (!row) {
    delete list.dataset.historyPreview;
    return;
  }
  list.dataset.historyPreview = stat;
  row.classList.add("history-preview");
  setActiveStatRow(row);
}

function clearHistoryPreview({ restoreAnchor = true } = {}) {
  const list = byId("cli-stats");
  if (list) {
    const previous = list.querySelector(".history-preview");
    if (previous) {
      previous.classList.remove("history-preview");
    }
    delete list.dataset.historyPreview;
  }
  historyIndex = commandHistory.length;
  if (restoreAnchor && historyAnchorStat) {
    const anchorRow = getStatRowByKey(historyAnchorStat);
    if (anchorRow) {
      setActiveStatRow(anchorRow);
    }
  }
  historyAnchorStat = null;
}

/**
 * Load stat names and render them into the CLI stat selection list.
 *
 * @summary Load stat names, build stat buttons, store display name map, and wire click handlers.
 * @pseudocode
 * 1. Load stat definitions via `loadStatDefs()`.
 * 2. Locate `#cli-stats`; clear existing entries and display name map.
 * 3. Build stat rows and append them, focusing the first.
 * 4. Bind click handler, render help mapping, and clear placeholders.
 *
 * @param {object} [judoka] - Optional judoka object providing current stat values.
 * @returns {Promise<void>} Resolves when the stat list has been rendered.
 */
export async function renderStatList(judoka) {
  try {
    const list = byId("cli-stats");
    const stats = await loadStatDefs();
    if (list && stats.length) {
      list.innerHTML = "";
      for (const key of Object.keys(statDisplayNames)) delete statDisplayNames[key];
      const rows = buildStatRows(stats, judoka);
      rows.forEach((row) => list.appendChild(row));

      // Mark as not skeleton after adding real content to prevent clearSkeletonStats from clearing it
      list.dataset.skeleton = "false";
      list.setAttribute("aria-busy", "false");

      if (rows.length) setActiveStatRow(rows[0], { focus: false });
      ensureStatClickBinding(list);
      try {
        window.__battleCLIinit?.clearSkeletonStats?.();
      } catch (err) {
        console.error("renderStatList: failed to clear skeleton stats", err);
      }
      renderHelpMapping(stats);
    }
  } catch (err) {
    console.error("renderStatList failed", err);
  }
}

function renderHiddenPlayerStats(judoka) {
  if (!hasDocument) return;
  try {
    const card = byId("player-card");
    if (!card) return;
    const ul = document.createElement("ul");
    STATS.forEach((stat) => {
      const li = document.createElement("li");
      li.className = "stat";
      const strong = document.createElement("strong");
      strong.textContent = statDisplayNames[stat] || stat;
      const span = document.createElement("span");
      const val = Number(judoka?.stats?.[stat]);
      span.textContent = Number.isFinite(val) ? String(val) : "";
      li.appendChild(strong);
      li.appendChild(document.createTextNode(" "));
      li.appendChild(span);
      ul.appendChild(li);
    });
    card.textContent = "";
    card.appendChild(ul);
  } catch {}
}

/**
 * Restore and persist the selected points-to-win value.
 *
 * @pseudocode
 * 1. Find `#points-select`; return if missing.
 * 2. Read saved value from storage and apply when valid.
 * 3. On select change:
 *    a. Ignore invalid values.
 *    b. Show confirm that scores reset and match restarts.
 *    c. If confirmed: save, apply, and reset without starting.
 *    d. Otherwise revert to previous value.
 */
/**
 * Restore, persist, and handle changes to the points-to-win selector.
 *
 * @summary Read the saved points-to-win value, apply it, and prompt the user on change.
 * @pseudocode
 * 1. Locate `#points-select` and read stored value using the provided storage wrapper.
 * 2. Build the allowed targets from defaults + select options, then apply any saved value.
 * 3. On user change: validate the chosen value, confirm reset, persist and reset when confirmed.
 *
 * @returns {void}
 */
export function restorePointsToWin() {
  try {
    const select = byId("points-select");
    if (!select) return;
    const optionValues = Array.from(select.options || [])
      .map((option) => Number(option.value))
      .filter((value) => Number.isFinite(value));
    const validTargets = new Set([...POINTS_TO_WIN_OPTIONS, ...optionValues]);
    const storage = wrap(BATTLE_POINTS_TO_WIN, { fallback: "none" });
    const savedPoints = safeGetPointsToWinFromStorage();
    if (savedPoints.error) {
      console.warn("Failed to restore pointsToWin from localStorage:", savedPoints.error);
    }
    if (savedPoints.found && validTargets.has(savedPoints.value)) {
      engineFacade.setPointsToWin?.(savedPoints.value);
      select.value = String(savedPoints.value);
    }
    const round = Number(byId("cli-root")?.dataset.round || 0);
    updateRoundHeader(round, engineFacade.getPointsToWin?.());
    let current = Number(select.value);
    select.addEventListener("change", async () => {
      const val = Number(select.value);
      if (!validTargets.has(val)) return;
      try {
        const title = "Confirm Points To Win";
        const desc = "Changing win target resets scores and restarts the match.";
        const frag = document.createDocumentFragment();
        const h2 = document.createElement("h2");
        h2.id = "points-to-win-title";
        h2.textContent = title;
        const p = document.createElement("p");
        p.id = "points-to-win-desc";
        p.textContent = desc;
        const actions = document.createElement("div");
        const confirmBtn = document.createElement("button");
        confirmBtn.type = "button";
        confirmBtn.textContent = "Confirm";
        confirmBtn.setAttribute("data-testid", "confirm-points-to-win");
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.textContent = "Cancel";
        cancelBtn.setAttribute("data-testid", "cancel-points-to-win");
        actions.appendChild(confirmBtn);
        actions.appendChild(cancelBtn);
        frag.appendChild(h2);
        frag.appendChild(p);
        frag.appendChild(actions);
        const modal = createModal(frag, {
          labelledBy: h2,
          describedBy: p
        });
        // attach modal to DOM so buttons exist
        document.body.appendChild(modal.element);
        const closeModal = () => {
          try {
            modal.close();
          } catch {}
        };
        await new Promise((resolve) => {
          let settled = false;
          const settle = (value) => {
            if (settled) return;
            settled = true;
            resolve(value);
          };

          const cancel = () => {
            settle(false);
            closeModal();
          };

          confirmBtn.addEventListener(
            "click",
            () => {
              settle(true);
              closeModal();
            },
            { once: true }
          );
          cancelBtn.addEventListener(
            "click",
            () => {
              cancel();
            },
            { once: true }
          );
          modal.element.addEventListener("cancel", cancel, { once: true });
          modal.element.addEventListener("close", cancel, { once: true });

          try {
            modal.open();
          } catch {}
        })
          .then(async (confirmed) => {
            if (confirmed) {
              storage.set(val);
              try {
                await resetMatch();
              } catch {}
              engineFacade.setPointsToWin?.(val);
              updateRoundHeader(0, val);
              try {
                await announceMatchReady({ focusMain: true });
              } catch {}
              current = val;
            } else {
              select.value = String(current);
            }
          })
          .finally(() => {
            try {
              modal.destroy();
            } catch {}
          });
      } catch {}
    });
  } catch {}
}

/**
 * Start a new round and prepare the CLI UI.
 *
 * @pseudocode
 * 1. Call core `startRound` → { judoka, roundNumber }.
 * 2. Render the stat list with current values.
 * 3. Clear the round message and show the prompt.
 * 4. Update round header with roundNumber and points target.
 */
async function startRoundWrapper() {
  const { playerJudoka, roundNumber } = await startRoundCore(store);
  currentPlayerJudoka = playerJudoka || null;
  await renderStatList(currentPlayerJudoka);
  renderHiddenPlayerStats(currentPlayerJudoka);
  setRoundMessage("");
  showBottomLine("Select your move");
  updateRoundHeader(roundNumber, engineFacade.getPointsToWin?.());
}

// Deprecated internal alias retained for backward-compat within module
/**
 * @summary Resolve a CLI stat selection key to its stat identifier.
 *
 * Converts the CLI-facing 1-based index into the corresponding entry within
 * {@link STATS}. Callers receive `null` when the index is outside the valid
 * range.
 *
 * @param {number|string} index1Based - 1-based index from user input.
 * @returns {string|null} Matching stat identifier or `null` when invalid.
 * @pseudocode
 * i ← Number(index1Based) − 1
 * if STATS[i] exists → return STATS[i]
 * return null
 */
export function getStatByIndex(index1Based) {
  const i = Number(index1Based) - 1;
  return STATS[i] || null;
}

/**
 * Handle global shortcuts that work in any state.
 * @param {string} key
 * @returns {boolean} true if the key was handled
 * @pseudocode
 * if key is 'h':
 *   toggle shortcuts panel
 *   return true
 * if key is 'q':
 *   show quit confirmation modal
 *   return true
 * return false
 */
/**
 * Global key lookup for the CLI.
 *
 * @pseudocode
 * map single-character keys to handler functions
 */
const globalKeyHandlers = {
  h() {
    const sec = byId("cli-shortcuts");
    if (sec) {
      if (!sec.open) {
        const activeElement = getActiveElement();
        state.shortcutsReturnFocus = activeElement instanceof HTMLElement ? activeElement : null;
        showCliShortcuts();
        const closeButton = byId("cli-shortcuts-close");
        if (closeButton) {
          closeButton.focus();
        } else {
          sec.querySelector("summary")?.focus();
        }
        return;
      }
      hideCliShortcuts();
    }
  },
  q() {
    showQuitModal();
  }
};

/**
 * Handle global CLI keys such as help and quit.
 *
 * @param {string} key - lowercased key value.
 * @returns {boolean} true when handled.
 * @pseudocode
 * fn = globalKeyHandlers[key]
 * if fn exists:
 *   fn()
 *   return true
 * return false
 */
export function handleGlobalKey(key) {
  const fn = globalKeyHandlers[key];
  if (fn) {
    fn();
    return true;
  }
  return false;
}

/**
 * @summary Defer a callback to the next microtask tick via `Promise.resolve`.
 *
 * Exposed for tests that need to await asynchronous UI updates without
 * altering production timing semantics.
 *
 * @param {() => void} fn - Callback to schedule for the next microtask.
 * @returns {Promise<void>} Promise that resolves after the callback runs.
 * @pseudocode
 * return Promise.resolve().then(fn)
 */
export const __scheduleMicrotask = (fn) => Promise.resolve().then(fn);

/**
 * Resolve stat key from a focused element intent payload.
 *
 * @param {{stat?: string, statIndex?: string|number}} intent - Focused intent payload.
 * @returns {string|null} Stat key or null when unavailable.
 * @pseudocode
 * if intent.stat exists: return it
 * if intent.statIndex exists: return getStatByIndex(statIndex)
 * return null
 */
function resolveFocusedStatFromIntent(intent) {
  if (intent?.stat) return intent.stat;
  if (intent?.statIndex !== undefined) return getStatByIndex(intent.statIndex);
  return null;
}

/**
 * Dispatch a normalized keyboard intent through domain handlers.
 *
 * @param {{type:string,[key:string]:any}} intent - Intent payload from key mapping.
 * @returns {boolean|'ignored'|'rejected'} Handling status.
 * @pseudocode
 * handle passive intents (tab/global/unmapped)
 * map intent type to existing handler APIs
 * when action is invalid for current state, emit canonical rejection event and return rejected
 */
export function handleIntent(intent) {
  if (!intent || typeof intent.type !== "string") return false;

  const state = document.body?.dataset?.battleState || "";

  const rejectIntent = (reason) => {
    try {
      emitBattleEvent("battle.intent.rejected", {
        source: "keyboard",
        intent,
        state,
        reason
      });
    } catch {}
    return "rejected";
  };

  if (intent.type === "tabNavigation") return "ignored";
  if (intent.type === "globalKeyHandled") return true;
  if (intent.type === "unmappedKey") return rejectIntent("key.unmapped");

  if (intent.type === "selectStatByIndex") {
    if (!isEnabled("statHotkeys")) return "ignored";
    if (store?.selectionMade || selectionApplying) {
      return rejectIntent("intent.notAllowedInState");
    }
    const key = String(intent.index);
    const handled = handleWaitingForPlayerActionKey(key);
    if (handled === "ignored") return "ignored";
    if (handled !== true) return rejectIntent("intent.notAllowedInState");
    return true;
  }

  if (intent.type === "selectFocusedStat") {
    if (store?.selectionMade || selectionApplying) {
      return rejectIntent("intent.notAllowedInState");
    }
    const stat = resolveFocusedStatFromIntent(intent);
    if (!stat) return rejectIntent("intent.missingTarget");
    __scheduleMicrotask(() => selectStat(stat));
    return true;
  }

  if (intent.type === "activateFocusedControl") {
    if (intent.control === "start") {
      if (state !== "waitingForMatchStart") {
        return rejectIntent("intent.notAllowedInState");
      }
      return handleWaitingForMatchStartKey("enter") || rejectIntent("intent.notAllowedInState");
    }
    if (intent.control === "continue") {
      if (state === "roundDisplay") {
        return handleRoundOverKey("enter") || rejectIntent("intent.notAllowedInState");
      }
      if (state === "roundWait") {
        return handleCooldownKey("enter") || rejectIntent("intent.notAllowedInState");
      }
      return rejectIntent("intent.notAllowedInState");
    }
    return rejectIntent("intent.unknownControl");
  }

  if (intent.type === "confirmFocusedControl") {
    if (state === "waitingForMatchStart") {
      return handleWaitingForMatchStartKey("enter") || rejectIntent("intent.notAllowedInState");
    }
    if (state === "roundDisplay") {
      return handleRoundOverKey("enter") || rejectIntent("intent.notAllowedInState");
    }
    if (state === "roundWait") {
      return handleCooldownKey("enter") || rejectIntent("intent.notAllowedInState");
    }
    if (state === "roundSelect") {
      const handled = handleWaitingForPlayerActionKey("enter");
      return handled || rejectIntent("intent.notAllowedInState");
    }
    return rejectIntent("intent.notAllowedInState");
  }

  return rejectIntent("intent.unknown");
}

/**
 * Handle key input while waiting for the player's stat selection.
 *
 * @summary Convert numeric key presses into stat selections when appropriate.
 * @param {string} key - Normalized single-character key value (e.g., '1').
 * @returns {boolean|'ignored'} True when the key was handled, "ignored" when hotkeys are disabled.
 * @pseudocode
 * if key is a digit AND statHotkeys disabled: return "ignored"
 * if key is a digit:
 *   stat = getStatByIndex(key)
 *   if stat missing:
 *     showHint("Use 1-5, press H for help")
 *     return true
 *   selectStat(stat)
 *   return true
 * if key is Enter:
 *   dataset ← activeElement?.dataset
 *   stat = dataset.stat || getStatByIndex(dataset.statIndex)
 *   if stat missing: return false
 *   selectStat(stat)
 *   return true
 * return false
 */
export function handleWaitingForPlayerActionKey(key) {
  try {
    console.log("[TEST LOG] handleWaitingForPlayerActionKey called with", key);
  } catch {}
  if (key >= "0" && key <= "9") {
    if (!isEnabled("statHotkeys")) return "ignored";
    const stat = getStatByIndex(key);
    if (!stat) {
      showHint("Use 1-5, press H for help");
      return true;
    }
    // Schedule stat selection on a microtask so the DOM updates remain observable
    // while matching the deferral behavior expected by latency-sensitive tests.
    __scheduleMicrotask(() => selectStat(stat));
    return true;
  }
  if (key === "enter") {
    if (selectionApplying || state.roundResolving) {
      console.debug("[TEST DEBUG] handleWaitingForPlayerActionKey enter skipped due to busy state");
      return false;
    }
    const activeElement = getActiveElement();
    const dataset = activeElement?.dataset;
    if (dataset) {
      const statKey =
        dataset.stat ||
        (dataset.statIndex !== undefined ? getStatByIndex(dataset.statIndex) : null);
      if (statKey) {
        __scheduleMicrotask(() => selectStat(statKey));
        return true;
      }
    }
    return false;
  }
  return false;
}

/**
 * Handle key presses while waiting for match start.
 * @param {string} key
 * @pseudocode
 * if key is 'enter':
 *   emit 'startClicked'
 *   return true
 * return false
 */
/**
 * Handles key presses when waiting for the match to start.
 *
 * @pseudocode
 * 1. If the key is "enter", emit the "startClicked" event to start the match.
 * 2. Return true if the key was handled, false otherwise.
 *
 * @param {string} key - The key that was pressed.
 * @returns {boolean} True if the key was handled, false otherwise.
 */
export function handleWaitingForMatchStartKey(key) {
  if (key === "enter") {
    triggerMatchStart();
    return true;
  }
  return false;
}

/**
 * Handle key presses after a round has resolved.
 * @param {string} key
 * @pseudocode
 * if key is Enter or Space:
 *   dispatch 'continue'
 *   return true
 * return false
 */
/**
 * Handle key input after a round has resolved.
 *
 * @summary Treat Enter/Space as confirmation to continue to the next state.
 * @param {string} key - Normalized key value (lowercased or space string).
 * @returns {boolean} True when the key was handled.
 * @pseudocode
 * if key is Enter or Space:
 *   dispatch 'continue'
 *   return true
 * return false
 */
export function handleRoundOverKey(key) {
  if (key === "enter" || key === " ") {
    try {
      emitBattleEvent("outcomeConfirmed");
    } catch {}
    try {
      // Try to synchronously call the orchestrator dispatch when available
      // so tests that mock `dispatchBattleEvent` observe the call immediately.
      const fn = battleOrchestrator?.dispatchBattleEvent;
      if (typeof fn === "function") {
        fn("continue");
      } else {
        // Fallback to safe async dispatch when orchestrator isn't available
        safeDispatch("continue");
      }
    } catch {}
    return true;
  }
  return false;
}

/**
 * Handle key presses during cooldown between rounds.
 * @param {string} key
 * @pseudocode
 * if key is Enter or Space:
 *   clear timers
 *   clear bottom line
 *   dispatch 'ready'
 *   return true
 * return false
 */
/**
 * Handle key input during cooldown between rounds.
 *
 * @summary Allow Enter/Space to skip cooldown, clear timers, and mark machine as ready.
 * @param {string} key - Normalized key value.
 * @returns {boolean} True when the key was handled.
 * @pseudocode
 * if key is Enter or Space:
 *   clearCooldownTimers()
 *   dispatch 'ready'
 *   return true
 * return false
 */
export function handleCooldownKey(key) {
  if (key === "enter" || key === " ") {
    clearCooldownTimers();
    try {
      safeDispatch("ready");
    } catch {}
    return true;
  }
  return false;
}

/**
 * Navigate through previously executed commands in the CLI.
 *
 * @summary Updates the displayed bottom line with the selected history entry
 * based on arrow key input and advances the history index cursor accordingly.
 * @param {string} key - Raw keyboard event `key` value.
 * @returns {boolean} True if the history view was updated.
 * @pseudocode
 * if key is ArrowUp and historyIndex > 0:
 *   decrement historyIndex
 *   show bottom line with current history command
 *   return true
 * if key is ArrowDown:
 *   if historyIndex < last history index:
 *     increment historyIndex
 *     show bottom line with current history command
 *     return true
 *   else if historyIndex is at last history index:
 *     increment historyIndex
 *     clear bottom line
 *     return true
 * return false
 */
export function handleCommandHistory(key) {
  console.log(
    "[DEBUG handleCommandHistory] key:",
    key,
    "commandHistory.length:",
    commandHistory.length,
    "historyIndex:",
    historyIndex
  );
  try {
    const stored = JSON.parse(localStorage.getItem("cliStatHistory") || "[]");
    if (Array.isArray(stored)) {
      commandHistory = stored;
    }
  } catch {}
  if (historyIndex < 0 || historyIndex > commandHistory.length) {
    historyIndex = commandHistory.length;
  }
  if (!commandHistory.length) return false;
  if (historyIndex < 0) historyIndex = commandHistory.length;
  if (key === "ArrowUp") {
    if (historyIndex === commandHistory.length) {
      historyAnchorStat = captureHistoryAnchorStat();
    }
    if (historyIndex > 0) {
      historyIndex--;
      const stat = commandHistory[historyIndex];
      applyHistoryPreview(stat);
      showBottomLine(`History: ${stat}`);
      return true;
    }
    return false;
  }
  if (key === "ArrowDown") {
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      const stat = commandHistory[historyIndex];
      applyHistoryPreview(stat);
      showBottomLine(`History: ${stat}`);
      return true;
    }
    if (historyIndex === commandHistory.length - 1) {
      historyIndex++;
      clearHistoryPreview();
      showBottomLine("");
      return true;
    }
  }
  return false;
}

registerBattleHandlers({
  handleGlobalKey,
  handleWaitingForPlayerActionKey,
  handleWaitingForMatchStartKey,
  handleRoundOverKey,
  handleCooldownKey,
  handleStatListArrowKey,
  handleCommandHistory,
  handleIntent
});

/**
 * Advance battle state when clicking outside interactive areas.
 *
 * @pseudocode
 * if roundResolving or ignoreNextAdvanceClick -> return
 * state = body.dataset.battleState
 * if click inside .cli-stat or #cli-shortcuts -> return
 * handler = stateAdvanceHandlers[state]
 * if no handler -> return
 * call handler()
 *
 * @param {MouseEvent} event - Click event.
 */
/**
 * Clear cooldown timers and reset bottom line.
 *
 * @pseudocode
 * if cooldownTimer -> clearTimeout
 * if cooldownInterval -> clearInterval
 * null timers then clearBottomLine()
 */
function clearCooldownTimers() {
  try {
    if (cooldownTimer) clearTimeout(cooldownTimer);
  } catch {}
  try {
    if (cooldownInterval) clearInterval(cooldownInterval);
  } catch {}
  cooldownTimer = null;
  cooldownInterval = null;
  clearBottomLine();
}

/**
 * Record state machine dispatch error without logging to console.
 *
 * @param {unknown} err Error to record.
 * @pseudocode
 * if window exists
 *   window.__battleDispatchError = String(err)
 */
function recordDispatchError(err) {
  try {
    if (typeof window !== "undefined") {
      window.__battleDispatchError = String(err);
    }
  } catch {}
}

/**
 * Dispatch continue on round over.
 *
 * @pseudocode
 * machine = getMachine()
 * machine.dispatch("continue") if available
 */
function advanceRoundOver() {
  try {
    const machine = getMachine();
    if (machine) machine.dispatch("continue");
  } catch (err) {
    recordDispatchError(err);
  }
}

/**
 * Clear timers then dispatch ready.
 *
 * @pseudocode
 * clearCooldownTimers()
 * machine = getMachine()
 * machine.dispatch("ready") if available
 */
function advanceCooldown() {
  clearCooldownTimers();
  try {
    const machine = getMachine();
    if (machine) machine.dispatch("ready");
  } catch (err) {
    recordDispatchError(err);
  }
}

const stateAdvanceHandlers = {
  roundDisplay: advanceRoundOver,
  roundWait: advanceCooldown
};

function onClickAdvance(event) {
  if (!hasDocument) return;
  try {
    if (state.roundResolving) return;
    if (state.ignoreNextAdvanceClick) {
      // Consume exactly one background click after closing help.
      state.ignoreNextAdvanceClick = false;
      return;
    }
  } catch {
    return;
  }
  const shortcutsPanel = byId("cli-shortcuts");
  if (shortcutsPanel?.open) return;
  if (event.target?.closest?.(".cli-stat")) return;
  if (event.target?.closest?.("#cli-shortcuts")) return;
  const stateName = document.body?.dataset?.battleState || "";
  const handler = stateAdvanceHandlers[stateName];
  if (!handler) return;
  handler();
}

// Phase 4: Removed handleScoreboardShowMessage and handleScoreboardClearMessage
// These are now handled by the shared Scoreboard adapter via initBattleScoreboardAdapter()

function handleStatSelectionStalled() {
  if (!isEnabled("autoSelect")) {
    showBottomLine("Stat selection stalled. Pick a stat.");
  }
}

function handleCountdownStart(e) {
  let skipHandled = false;
  const skipEnabled = skipRoundCooldownIfEnabled({
    onSkip: () => {
      skipHandled = true;
    }
  });
  if (skipEnabled && skipHandled) {
    return;
  }
  const ds = typeof document !== "undefined" ? document.body?.dataset : undefined;
  if (ds) ds.battleState = "roundWait";
  // Ensure score line reflects the resolved round before any user interaction
  try {
    updateScoreLine();
  } catch {}
  const rawDuration = Number(e?.detail?.duration);
  const rawDurationMs = Number(e?.detail?.durationMs);
  const duration = Number.isFinite(rawDuration)
    ? rawDuration
    : Number.isFinite(rawDurationMs)
      ? Math.ceil(rawDurationMs / 1000)
      : 0;
  renderRoundWaitCountdown(duration);
}

function handleCountdownFinished() {
  cooldownTimer = null;
  cooldownInterval = null;
  clearRoundWaitCountdown();
}

function handleRoundEvaluated(e) {
  state.roundResolving = false;
  const { message, statKey, playerVal, opponentVal, scores } = e.detail || {};
  recordCommandHistory(statKey || store?.playerChoice);
  if (message || scores) {
    const display = statDisplayNames[statKey] || String(statKey || "").toUpperCase();
    setRoundMessage(`${message || ""} (${display} – You: ${playerVal} Opponent: ${opponentVal})`);
    let playerScore = scores?.player;
    let opponentScore = scores?.opponent;
    try {
      if (playerScore === undefined || opponentScore === undefined) {
        const gs = engineFacade.getScores?.();
        if (gs) {
          if (playerScore === undefined) playerScore = gs.playerScore;
          if (opponentScore === undefined) opponentScore = gs.opponentScore;
        }
      }
    } catch {}
    playerScore = playerScore === undefined || playerScore === null ? 0 : playerScore;
    opponentScore = opponentScore === undefined || opponentScore === null ? 0 : opponentScore;
    updateScoreLine({ playerScore, opponentScore });
    // Add detailed info to verbose log if enabled
    if (isEnabled("cliVerbose")) {
      const verboseLog = byId("cli-verbose-log");
      if (verboseLog) {
        const round = Number(byId("cli-root")?.dataset.round || 0);
        const entry = `Round ${round}: ${message || ""} (${display} – You: ${playerVal}, Opponent: ${opponentVal}). Scores: You ${playerScore}, Opponent ${opponentScore}\n`;
        verboseLog.textContent += entry;
        ensureVerboseScrollHandling();
        refreshVerboseScrollIndicators();
      }
    }
  }
}

/**
 * Show restart controls when a match concludes.
 *
 * @pseudocode
 * 1. Locate `#cli-main`; abort if missing or already rendered.
 * 2. Build a "Play Again" button that resets the match and restarts on click.
 * 3. If a home link exists, append a "Return to lobby" anchor using its href.
 * 4. Append the controls section to the main container.
 */
function handleMatchOver() {
  if (!hasDocument) return;
  const main = byId("cli-main");
  if (!main || byId("play-again-button")) return;
  const section = document.createElement("section");
  section.className = "cli-block";
  const btn = createButton("Play Again", {
    id: "play-again-button",
    className: "primary-button"
  });
  btn.addEventListener("click", async () => {
    await resetMatch();
    section.remove();
    await triggerMatchStart();
  });
  section.append(btn);
  try {
    const homeHref = document.querySelector("[data-testid='home-link']")?.getAttribute("href");
    if (homeHref) {
      const link = document.createElement("a");
      link.id = "return-to-lobby-link";
      link.href = homeHref;
      link.textContent = "Return to lobby";
      section.append(" ", link);
    }
  } catch {}
  main.append(section);
}

/**
 * Handle scoreboard adapter message display by updating the CLI round message.
 *
 * @param {{ detail?: string }} e
 * @returns {void}
 */
function handleScoreboardShowMessage(e) {
  try {
    const text = e?.detail ?? "";
    setRoundMessage(String(text));
  } catch {}
}

/**
 * Handle scoreboard adapter message clear by resetting the CLI round message.
 *
 * @returns {void}
 */
function handleScoreboardClearMessage() {
  try {
    setRoundMessage("");
  } catch {}
}

function syncControlsHintVisibility(state) {
  try {
    const hint = byId("cli-controls-hint");
    controlsHintActive = state === "roundSelect";
    if (hint) {
      hint.hidden = !controlsHintActive;
    }
    updateShortcutsFallback(getCliShortcutsEnabled());
  } catch {}
}

/**
 * Update UI elements based on the current battle state.
 *
 * @pseudocode
 * 1. Update state badge and remove transient Next button.
 * 2. Clear verbose log when match starts.
 * 3. Start or stop selection countdown depending on state.
 * 4. Reset roundResolving flag when entering roundSelect.
 * 5. Show bottom line hint when waiting to continue.
 *
 * @param {string} battleState - New battle state.
 * @returns {void}
 */
function updateUiForState(battleState) {
  updateBattleStateBadge(battleState);
  syncControlsHintVisibility(battleState);
  if (hasDocument) {
    try {
      document.getElementById("next-round-button")?.remove();
    } catch {}
  }
  if (battleState === "matchStart") {
    clearVerboseLog();
  }
  if (battleState === "roundSelect") {
    // Reset the CLI-specific state flags when entering player action state.
    // This ensures stat selection is allowed even if a previous round's handlers
    // haven't fully completed (edge case with fast state transitions in tests).
    state.roundResolving = false;
    selectionApplying = false;
    startSelectionCountdown(30);
    byId("cli-stats")?.focus();
  } else {
    stopSelectionCountdown();
  }
  if (battleState === "roundDisplay" && !getAutoContinue()) {
    showBottomLine("Press Enter to continue");
  }
}

/**
 * Ensure a Next button exists for advancing rounds.
 *
 * @pseudocode
 * 1. Abort if button already exists or `#cli-main` missing.
 * 2. Create button and section wrapper.
 * 3. On click, clear cooldown timers, bottom line, and dispatch `continue`.
 * 4. Focus the button for accessibility.
 *
 * @returns {void}
 */
function ensureNextRoundButton() {
  if (!hasDocument) return;
  try {
    const main = byId("cli-main");
    if (!main || document.getElementById("next-round-button")) return;
    const section = document.createElement("section");
    section.className = "cli-block";
    const btn = document.createElement("button");
    btn.id = "next-round-button";
    btn.className = "primary-button";
    btn.textContent = "Next";
    btn.setAttribute("aria-label", "Continue to next round");
    btn.addEventListener("click", () => {
      clearCooldownTimers();
      try {
        safeDispatch("continue");
      } catch {}
    });
    section.appendChild(btn);
    main.appendChild(section);
    try {
      btn.focus();
    } catch {}
  } catch (err) {
    console.error("Failed to render next-round-button", err);
  }
}

/**
 * Log a state change line to the verbose log.
 *
 * @pseudocode
 * 1. Locate verbose log `<pre>`; abort if missing.
 * 2. Compose timestamped `from -> to` line and emit via `console.info`.
 * 3. Append to log, keeping at most 50 lines and scroll to bottom.
 *
 * @param {string|null} from - Previous state.
 * @param {string} to - New state.
 * @returns {void}
 */
function logStateChange(from, to) {
  try {
    const pre = byId("cli-verbose-log");
    if (!pre) return;
    const ts = new Date();
    const hh = String(ts.getHours()).padStart(2, "0");
    const mm = String(ts.getMinutes()).padStart(2, "0");
    const ss = String(ts.getSeconds()).padStart(2, "0");
    const line = `[${hh}:${mm}:${ss}] ${from || "(init)"} -> ${to}`;
    console.info(line);
    const existing = pre.textContent ? pre.textContent.split("\n").filter(Boolean) : [];
    existing.push(line);
    while (existing.length > 50) existing.shift();
    pre.textContent = existing.join("\n");
    pre.scrollTop = pre.scrollHeight;
    ensureVerboseScrollHandling();
    refreshVerboseScrollIndicators();
  } catch {}
}

function handleBattleState(ev) {
  const { from, to, event } = ev.detail || {};
  const currentState = document.body?.dataset?.battleState || "";
  const protectedEntryStates = new Set(["matchStart", "roundWait", "roundPrompt", "roundSelect"]);
  const isDirectStateInjection =
    currentState === "waitingForMatchStart" &&
    protectedEntryStates.has(String(to || "")) &&
    event !== "startClicked";

  if (isDirectStateInjection) {
    emitBattleEvent("battle.unavailable", {
      action: "stateTransition",
      reason: "state_injection_blocked",
      attemptedTo: to
    });
    return;
  }

  if (hasDocument && to) {
    try {
      document.body.dataset.battleState = String(to);
      document.body.setAttribute("data-battle-state", String(to));
    } catch {}
  }
  updateUiForState(to);
  if (to === "roundDisplay" && !getAutoContinue()) ensureNextRoundButton();
  if (verboseEnabled) logStateChange(from, to);
}

const battleEventHandlers = {
  // Phase 4: Removed scoreboardShowMessage and scoreboardClearMessage handlers
  // These are now handled by the shared Scoreboard adapter
  statSelectionStalled: handleStatSelectionStalled,
  countdownStart: handleCountdownStart,
  countdownFinished: handleCountdownFinished,
  "control.countdown.completed": handleCountdownFinished,
  "cooldown.timer.expired": handleCountdownFinished,
  countdownTick: handleCooldownTimerTick,
  nextRoundCountdownTick: handleCooldownTimerTick,
  "cooldown.timer.tick": handleCooldownTimerTick,
  "round.evaluated": handleRoundEvaluated,
  matchOver: handleMatchOver,
  "battle.unavailable": handleBattleUnavailable
};

const battleStateHandlers = {
  battleStateChange: [handleBattleState, handleBattleStateChange]
};

function forEachBattleSubscription(callback) {
  Object.entries(battleEventHandlers).forEach(([event, handler]) => {
    callback(event, handler);
  });
  Object.entries(battleStateHandlers).forEach(([event, handlers]) => {
    handlers.forEach((handler) => callback(event, handler));
  });
}

function installEventBindings() {
  if (battleEventBindingsInstalled) {
    return;
  }
  try {
    if (typeof onBattleEvent === "function") {
      forEachBattleSubscription((event, handler) => onBattleEvent(event, handler));
      if (typeof removeIntentRejectionFeedback === "function") {
        removeIntentRejectionFeedback();
      }
      removeIntentRejectionFeedback = installIntentRejectionFeedback();
      battleEventBindingsInstalled = true;
    }
  } catch {}
}

function uninstallEventBindings() {
  if (!battleEventBindingsInstalled) {
    return;
  }
  try {
    if (typeof offBattleEvent === "function") {
      forEachBattleSubscription((event, handler) => offBattleEvent(event, handler));
    }
  } catch {}
  if (typeof removeIntentRejectionFeedback === "function") {
    try {
      removeIntentRejectionFeedback();
    } catch {}
  }
  removeIntentRejectionFeedback = null;
  battleEventBindingsInstalled = false;
}

/**
 * Parse URL parameters to set feature flags.
 *
 * @pseudocode
 * 1. Get URL search params.
 * 2. For each known flag, if present in URL, set the flag to the boolean value.
 */
function parseUrlFlags() {
  if (typeof window === "undefined") return;
  const urlParams = new URLSearchParams(window.location.search);
  const flags = [
    "battleStateBadge",
    "cliVerbose",
    "battleStateProgress",
    "skipRoundCooldown",
    "statHotkeys",
    "cliShortcuts",
    "autoSelect",
    "opponentDelayMessage",
    "roundStore"
  ];
  flags.forEach((flag) => {
    if (urlParams.has(flag)) {
      const value = urlParams.get(flag) === "true";
      setFlag(flag, value);
    }
  });
}

/**
 * Initialize feature flags and verbose UI bindings.
 *
 * @pseudocode
 * 1. Locate verbose checkbox and section.
 * 2. Initialize feature flags and local verbose state.
 * 3. Bind listeners for checkbox, shortcuts close, and flag changes.
 * 4. Update UI visibility based on verbose flag.
 *
 * @returns {Promise<{toggleVerbose: (enable: boolean) => Promise<void>}>}
 */
export async function setupFlags() {
  const checkbox = byId("verbose-toggle");
  const section = byId("cli-verbose-section");
  const applyScanlines = () => {
    if (!hasDocument) {
      return;
    }
    try {
      const scanlinesEnabled = !!isEnabled("scanlines");
      const body = document.body;
      if (body?.classList) {
        body.classList.toggle("scanlines", scanlinesEnabled);
      }
    } catch {}
  };

  const updateVerbose = () => {
    const root = byId("cli-root");
    const indicator = byId("verbose-indicator");
    if (checkbox) checkbox.checked = !!verboseEnabled;
    if (root) {
      root.dataset.verbose = verboseEnabled ? "true" : "false";
    }
    if (section) {
      section.setAttribute("aria-expanded", verboseEnabled ? "true" : "false");
      section.setAttribute("aria-hidden", verboseEnabled ? "false" : "true");
    }
    if (indicator) {
      indicator.setAttribute("aria-hidden", verboseEnabled ? "false" : "true");
    }
    if (verboseEnabled) {
      try {
        // Scroll the verbose section into view when supported
        if (section && typeof section.scrollIntoView === "function") {
          section.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        // Focus the verbose log for keyboard navigation
        const pre = byId("cli-verbose-log");
        if (pre) {
          if (pre.tabIndex !== -1) {
            pre.tabIndex = -1;
          }
          pre.scrollTop = pre.scrollHeight;
          try {
            pre.focus({ preventScroll: true });
          } catch {
            try {
              pre.focus();
            } catch {}
          }
        }
      } catch {}
    }
    ensureVerboseScrollHandling();
    refreshVerboseScrollIndicators();
  };
  const parseHeaderTarget = (value) => {
    if (value === undefined) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  };
  const toggleVerbose = async (enable) => {
    let target;
    let hasStoredTarget = false;
    try {
      const getter = engineFacade.getPointsToWin;
      if (typeof getter === "function") {
        target = getter();
        hasStoredTarget = true;
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.debug("Failed to get points to win:", error);
      }
      hasStoredTarget = false;
      target = undefined;
    }

    const root = byId("cli-root");
    const round = Number(root?.dataset.round || 0);
    const previousHeaderTarget = parseHeaderTarget(root?.dataset.target);
    const previousVerboseEnabled = !!verboseEnabled;

    verboseEnabled = !!enable;
    updateVerbose();

    let headerTarget = target;
    if (!hasStoredTarget && previousHeaderTarget !== undefined) {
      headerTarget = previousHeaderTarget;
    }
    updateRoundHeader(round, headerTarget);

    try {
      await setFlag("cliVerbose", enable);
    } catch (error) {
      verboseEnabled = previousVerboseEnabled;
      updateVerbose();
      const currentRound = Number(byId("cli-root")?.dataset.round) || 0;
      updateRoundHeader(currentRound, previousHeaderTarget);
      if (process.env.NODE_ENV === "development") {
        console.debug("Failed to persist CLI verbose flag:", error);
      }
      throw error;
    }

    try {
      const setter = engineFacade.setPointsToWin;
      if (hasStoredTarget && typeof setter === "function") {
        setter(target);
      }
    } catch {}
  };
  try {
    await initFeatureFlags();
  } catch {}
  try {
    if (typeof window !== "undefined") {
      const shouldAutoEnableShortcuts =
        window.__PLAYWRIGHT_TEST__ ||
        (window.__TEST__ &&
          (() => {
            try {
              return isEnabled("cliShortcuts") !== false;
            } catch {
              return true; // Default to enabling if flag check fails
            }
          })());
      if (shouldAutoEnableShortcuts) {
        await setFlag("cliShortcuts", true);
        await setFlag("statHotkeys", true);
      }
    }
  } catch {}
  initDebugFlagHud();
  ensureVerboseScrollHandling();
  refreshVerboseScrollIndicators();
  try {
    verboseEnabled = !!isEnabled("cliVerbose");
  } catch {}
  applyScanlines();
  setAutoContinue(true);
  try {
    const params = new URLSearchParams(location.search);
    if (params.has("verbose")) {
      const v = params.get("verbose");
      await toggleVerbose(v === "1" || v === "true");
    }
    if (params.has("skipRoundCooldown")) {
      const skip = params.get("skipRoundCooldown") === "1";
      setFlag("skipRoundCooldown", skip);
    }
    if (params.has("autoContinue")) {
      const v = params.get("autoContinue");
      setAutoContinue(!(v === "0" || v === "false"));
    }
  } catch {}
  updateVerbose();
  toggleVerboseFromFlags = toggleVerbose;
  applyScanlinesFromFlags = applyScanlines;
  updateVerboseFromFlags = updateVerbose;
  updateStateBadgeVisibility();
  updateBattleStateBadge(getStateSnapshot().state);
  wireFlagsListeners();
  updateCliShortcutsVisibility();
  updateControlsHint();
  return { toggleVerbose };
}

/**
 * Subscribes UI elements and helpers to events emitted by the battle engine.
 *
 * @summary This function sets up listeners for key battle engine events to
 * update the CLI's display in real-time.
 *
 * @pseudocode
 * 1. Check if the `engineFacade` exposes an `on` method (indicating the engine is available).
 * 2. If available, subscribe to the `timerTick` event:
 *    a. When a `timerTick` event occurs, if the `phase` is "round", update the text content of the `#cli-timer` element with the `remaining` time.
 * 3. Subscribe to the `matchEnded` event:
 *    a. When a `matchEnded` event occurs, update the round message to display "Match over: [outcome]".
 * 4. Wrap the subscriptions in a `try...catch` block to gracefully handle any errors during event binding.
 *
 * @returns {void}
 */
export function subscribeEngine() {
  try {
    if (typeof engineFacade.on === "function") {
      engineFacade.on("timerTick", ({ remaining, phase }) => {
        if (phase === "round") {
          const el = byId("cli-countdown");
          if (el) {
            // Respect any short-lived UI freeze requested by the outer CLI helper
            try {
              const freezeUntil = window.__battleCLIinit?.__freezeUntil || 0;
              if (freezeUntil && Date.now() < freezeUntil) {
                return;
              }
            } catch {}
            el.dataset.remainingTime = String(remaining);
            if (el.dataset.status !== "error") {
              el.textContent = `Time remaining: ${remaining}`;
            }
          }
        }
      });
      engineFacade.on("matchEnded", ({ outcome }) => {
        setRoundMessage(`Match over: ${outcome}`);
        const announcementEl = byId("match-announcement");
        if (announcementEl) {
          announcementEl.textContent = `Match over. ${outcome === "playerWin" ? "You win!" : outcome === "opponentWin" ? "Opponent wins." : "It's a draw."}`;
        }
      });
    }
  } catch {}
}

/**
 * Handle battle state changes to show/hide keyboard hint.
 *
 * @param {object} detail - Event detail with from and to states.
 */
function handleBattleStateChange({ from, to }) {
  const hint = byId("cli-controls-hint");
  if (!hint) return;
  if (to === "roundSelect") {
    hint.hidden = false;
  } else if (from === "roundSelect") {
    hint.hidden = true;
  }
}

/**
 * Pause timers and engine countdown when the document is hidden.
 *
 * @returns {void}
 */
function handleVisibilityChange() {
  if (typeof document === "undefined") {
    return;
  }
  if (document.hidden) {
    pauseTimers();
    try {
      if (store?.engine?.handleTabInactive) {
        store.engine.handleTabInactive();
      }
    } catch (err) {
      console.log("[TIMER] Engine pause failed:", err.message);
    }
    return;
  }
  resumeTimers();
  try {
    if (store?.engine?.handleTabActive) {
      store.engine.handleTabActive();
    }
  } catch (err) {
    console.log("[TIMER] Engine resume failed:", err.message);
  }
}

/**
 * Resume timers when a page is restored from bfcache.
 *
 * @param {PageTransitionEvent} event - The `pageshow` event payload.
 * @returns {void}
 */
function handlePageShow(event) {
  try {
    if (event?.persisted) {
      resumeTimers();
    }
  } catch {}
}

/**
 * Pause timers before the page is hidden or unloaded.
 *
 * @returns {void}
 */
function handlePageHide() {
  try {
    pauseTimers();
  } catch {}
}

/**
 * Remove CLI lifecycle and interaction listeners previously wired by `wireEvents`.
 *
 * @returns {void}
 * @pseudocode
 * if not currently wired → return
 * remove battle state listener from battle event bus
 * remove keydown/pageshow/pagehide listeners from window
 * remove click/visibility/escape listeners from document
 * mark listeners as unwired
 */
export function unwireEvents() {
  uninstallEventBindings();
  if (eventsWired) {
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("keydown", handleGlobalEscape);
      document.removeEventListener("click", onClickAdvance);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
    eventsWired = false;
  }
  cleanupFlagsListeners();
  toggleVerboseFromFlags = null;
  applyScanlinesFromFlags = () => {};
  updateVerboseFromFlags = () => {};
}

/**
 * Bind classic battle CLI interactions and lifecycle hooks to the page.
 *
 * @summary Install CLI-specific DOM bindings and lifecycle listeners so the
 * interface reacts to battle state changes, keyboard shortcuts, and page
 * visibility updates.
 *
 * @pseudocode
 * 1. Call `installEventBindings()` to connect DOM event helpers.
 * 2. Subscribe to `battleStateChange` to toggle the keyboard hint.
 * 3. Attach keyboard and click handlers for advance controls and Escape handling.
 * 4. Register visibility lifecycle listeners to pause or resume timers.
 *
 * @returns {void}
 */
export function wireEvents() {
  if (eventsWired) {
    return;
  }
  installEventBindings();
  // Critical: Register round UI event handlers including round.start listener
  // that dismisses countdown/opponent snackbars when Next is clicked or round advances.
  // Bug: If this call is missing, snackbars (like "You Picked: X") persist across rounds.
  bindRoundFlowControllerOnce();
  bindRoundUIEventHandlersDynamic();
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("keydown", handleGlobalEscape);
    document.addEventListener("click", onClickAdvance);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }
  eventsWired = true;
}

/**
 * Boot the battle CLI page.
 *
 * @summary Initialize store, flags, UI, and orchestrator wiring.
 * @returns {Promise<void>}
 * @pseudocode
 * initSeed()
 * store = createBattleStore()
 * expose store on window
 * await renderStatList()
 * restorePointsToWin()
 * await setupFlags()
 * subscribeEngine()
 * await resetMatch()
 * await resetPromise
 * try resolveRoundStartPolicy()
 * catch → announce match ready with focus
 * otherwise announce match ready without focus
 * wireEvents()
 */
export async function init() {
  try {
    commandHistory = JSON.parse(localStorage.getItem("cliStatHistory") || "[]");
    historyIndex = commandHistory.length;
  } catch {
    commandHistory = [];
    historyIndex = -1;
  }
  initSeed();
  store = createBattleStore();
  normalizeShortcutCopy();
  bindSkipLinkFocusTarget();
  updateControlsHint();
  ensureVerboseScrollHandling();
  // Enable outcome confirmation pause for better UX
  store.waitForOutcomeConfirmation = true;
  try {
    if (typeof window !== "undefined") {
      window.battleStore = store;
    }
  } catch {}

  // Expose test API for testing direct access
  try {
    exposeTestAPI();
  } catch {}

  // Expose test hooks for automation
  try {
    if (typeof window !== "undefined") {
      window.testHooks = {
        startRound: async () => {
          await startRoundCore(store);
        },
        resolveRound: async () => {
          const snapshot = getStateSnapshot();
          const previousState = snapshot?.state ?? null;
          let resolvedViaOrchestrator = false;

          try {
            await resolveRoundForTest();
            resolvedViaOrchestrator = true;
          } catch (error) {
            console.warn(
              "resolveRoundForTest failed; falling back to manual round resolution",
              error
            );
          }

          if (!resolvedViaOrchestrator) {
            emitBattleEvent("round.evaluated", {});
          }

          const detail = { from: previousState, to: "roundDisplay", event: "round.evaluated" };
          domStateListener({ detail });
          emitBattleEvent("battleStateChange", detail);
        },
        getInternalState: () => {
          return {
            store: store,
            currentRound: store.currentRound,
            scores: store.scores,
            matchLength: store.matchLength
          };
        }
      };
    }
  } catch {}

  await renderStatList();
  restorePointsToWin();
  parseUrlFlags();
  await setupFlags();
  subscribeEngine();
  battleInstance = createBattleInstance();

  // Assign the engine to the store for debug access
  try {
    if (typeof engineFacade.getEngine === "function") {
      store.engine = engineFacade.getEngine();
    }
  } catch {}

  await resetMatch();
  await resetPromise;

  if (hasDocument) {
    // Phase 2: Initialize shared Scoreboard alongside CLI-specific logic
    try {
      // Setup shared Scoreboard component with timer controls
      const timerControls = {
        pauseTimer: () => {}, // CLI handles its own timers
        resumeTimer: () => {} // CLI handles its own timers
      };
      setupScoreboard(timerControls);

      // Initialize PRD battle scoreboard adapter for canonical events
      initBattleScoreboardAdapter({ catalogVersion: stateCatalogVersion });
    } catch (error) {
      console.warn("Failed to initialize shared Scoreboard in CLI:", error);
    }
  }

  let announceWithFocus = false;
  try {
    await resolveRoundStartPolicy(startCallback);
  } catch {
    announceWithFocus = true;
  }

  if (announceWithFocus) {
    await announceMatchReady({ focusMain: true });
  } else {
    await announceMatchReady();
  }
  if (hasDocument) {
    try {
      if (window.__TEST__ || window.__PLAYWRIGHT_TEST__) {
        if (!document.body.hasAttribute("tabindex")) {
          document.body.tabIndex = -1;
        }
      }
    } catch {}
  }
  wireEvents();
}

if (typeof window === "undefined" || !window.__TEST__) {
  if (!hasDocument) {
    init();
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

// Expose for tests
if (typeof window !== "undefined") {
  window.__test = __test;
  // Expose debug hooks for test access
  window.debugHooks = debugHooks;
  // Expose battle event emitter for test access
  window.emitBattleEvent = emitBattleEvent;
}
