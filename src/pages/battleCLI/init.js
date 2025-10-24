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
import { onBattleEvent, emitBattleEvent } from "../../helpers/classicBattle/battleEvents.js";
import { STATS } from "../../helpers/BattleEngine.js";
import * as engineFacade from "../../helpers/battleEngineFacade.js";
import statNamesData from "../../data/statNames.js";
import { fetchJson } from "../../helpers/dataUtils.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { showSnackbar } from "../../helpers/showSnackbar.js";
import {
  initFeatureFlags,
  isEnabled,
  setFlag,
  featureFlagsEmitter
} from "../../helpers/featureFlags.js";
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
import { setAutoContinue, autoContinue } from "../../helpers/classicBattle/orchestratorHandlers.js";
import { initRoundSelectModal } from "../../helpers/classicBattle/roundSelectModal.js";
import { domStateListener } from "../../helpers/classicBattle/stateTransitionListeners.js";
import { SNACKBAR_REMOVE_MS } from "../../helpers/constants.js";
import { exposeTestAPI } from "../../helpers/testApi.js";
// Phase 2: Shared Scoreboard imports for dual-write
import { setupScoreboard } from "../../helpers/setupScoreboard.js";
import { initBattleScoreboardAdapter } from "../../helpers/battleScoreboard.js";
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
import { onKeyDown } from "./events.js";
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

if (hasDocument) {
  try {
    document.addEventListener("keydown", handleGlobalEscape);
  } catch {}
}
/**
 * Delay between manual fallback state transitions when the orchestrator is unavailable.
 *
 * @summary This constant defines the delay in milliseconds between manual fallback state transitions when the orchestrator is unavailable.
 *
 * @constant {number}
 * @pseudocode
 * 1. When the orchestrator is unavailable, the CLI will manually transition between battle states.
 * 2. This constant defines the delay between each of those transitions.
 */
export const MANUAL_FALLBACK_DELAY_MS = 50;

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

function disposeClassicBattleOrchestrator() {
  try {
    battleOrchestrator?.disposeClassicBattleOrchestrator?.();
  } catch {
    /* ignore: orchestrator may not be initialized */
  }
}

/**
 * Safely dispatch an event to the classic battle machine.
 *
 * @param {string} eventName
 * @param {*} [payload]
 * @returns {Promise<*>} Resolves with the dispatch result when handled, or `undefined` if no handler is available.
 * @pseudocode
 * 1. Try debugHooks channel first to get the live machine and call `dispatch`.
 * 2. Fallback to orchestrator's `dispatchBattleEvent` if available (when not mocked).
 * 3. Swallow any errors to keep CLI responsive during tests.
 */
export async function safeDispatch(eventName, payload) {
  // DEBUG: Log dispatch attempts to understand why stat selection fails
  const isDebugEvent = eventName === "statSelected";
  if (isDebugEvent) {
    console.log("[CLI.safeDispatch] Attempting dispatch:", eventName);
  }

  try {
    const getter = debugHooks?.readDebugState?.("getClassicBattleMachine");
    const m = typeof getter === "function" ? getter() : getter;
    if (isDebugEvent) {
      console.log("[CLI.safeDispatch] debugHooks getter result:", { getter, m });
    }
    if (m?.dispatch) {
      if (isDebugEvent) {
        console.log("[CLI.safeDispatch] Using debugHooks machine dispatch");
      }
      return payload === undefined
        ? await m.dispatch(eventName)
        : await m.dispatch(eventName, payload);
    }
  } catch (err) {
    if (isDebugEvent) {
      console.log("[CLI.safeDispatch] debugHooks path failed:", err?.message);
    }
  }

  try {
    const fn = battleOrchestrator?.dispatchBattleEvent;
    if (isDebugEvent) {
      console.log("[CLI.safeDispatch] battleOrchestrator.dispatchBattleEvent:", typeof fn);
    }
    if (typeof fn === "function") {
      if (isDebugEvent) {
        console.log("[CLI.safeDispatch] Using battleOrchestrator dispatch");
      }
      return payload === undefined ? await fn(eventName) : await fn(eventName, payload);
    }
  } catch (err) {
    if (isDebugEvent) {
      console.log("[CLI.safeDispatch] battleOrchestrator path failed:", err?.message);
    }
  }

  if (isDebugEvent) {
    console.log("[CLI.safeDispatch] DISPATCH FAILED - no handler found for:", eventName);
  }
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
const SHORTCUT_HINT_MESSAGES = {
  default:
    "Use keys 1 through 5 to choose a stat, Enter or Space to continue, H to toggle help, and Q to quit.",
  statHotkeysDisabled:
    "Stat hotkeys are disabled. Use Enter or Space to continue, H to toggle help, and Q to quit.",
  shortcutsDisabled:
    "Keyboard shortcuts are disabled. Use the on-screen controls or enable CLI shortcuts in settings."
};
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
      selectionCancelled = false;
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

      // Cache state
      cachedStatDefs = null;
      Object.keys(statDisplayNames).forEach((key) => {
        delete statDisplayNames[key];
      });
    }
  });
} catch {
  // Ignore in non-browser environments where `window` is undefined
}
const statDisplayNames = {};
let cachedStatDefs = null;

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

  return document.getElementById("cli-root");
}

/**
 * Resolve the active round through the orchestrator for deterministic tests.
 *
 * @param {object} [eventLike]
 * @returns {Promise<{ detail: object, dispatched: boolean, emitted: boolean }>}
 * @pseudocode
 * return resolveRoundForTestHelper(eventLike, {
 *   dispatch: detail => safeDispatch("roundResolved", detail),
 *   emitOpponentReveal: detail => emitBattleEvent("opponentReveal", detail),
 *   emit: detail => emitBattleEvent("roundResolved", detail),
 *   getStore: () => store
 * })
 */
async function resolveRoundForTest(eventLike = {}) {
  return resolveRoundForTestHelper(eventLike, {
    dispatch: (detail) => safeDispatch("roundResolved", detail),
    emitOpponentReveal: (detail) => emitBattleEvent("opponentReveal", detail),
    emit: (detail) => emitBattleEvent("roundResolved", detail),
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
  // Expose init for tests to manually initialize without DOMContentLoaded
  init,
  // Phase 4: Removed handleScoreboardShowMessage and handleScoreboardClearMessage exports
  // These functions have been removed as they're now handled by shared Scoreboard adapter
  handleStatSelectionStalled,
  handleCountdownStart,
  handleCountdownFinished,
  handleRoundResolved,
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
    const list = document.getElementById("cli-stats");
    list?.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
    list?.querySelectorAll(".cli-stat").forEach((el) => el.setAttribute("aria-selected", "false"));
    if (list && list.dataset.selectedIndex) delete list.dataset.selectedIndex;
  } catch {}
  // Re-apply seed for deterministic behavior on match reset
  initSeed();
  // Perform asynchronous reset work
  const next = (async () => {
    disposeClassicBattleOrchestrator();
    await resetGame(store);
  })();
  // Initialize orchestrator after sync work without blocking callers
  resetPromise = next.then(async () => {
    try {
      const orchestrator = await battleOrchestrator.initClassicBattleOrchestrator?.(
        store,
        startRoundWrapper
      );
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
 * Used to satisfy initRoundSelectModal's `onStart` parameter in the CLI,
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
 * if dispatch fails → emit manual battleStateChange fallback sequence
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
  try {
    const result = await safeDispatch("startClicked");
    dispatched = result !== undefined ? Boolean(result) : !!result;
  } catch {
    dispatched = false;
  }

  if (dispatched) {
    return;
  }

  try {
    console.warn("[CLI] Orchestrator unavailable, using manual state progression");
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    emitBattleEvent("battleStateChange", { to: "matchStart" });
    await wait(MANUAL_FALLBACK_DELAY_MS);
    emitBattleEvent("battleStateChange", { to: "cooldown" });
    await wait(MANUAL_FALLBACK_DELAY_MS);
    emitBattleEvent("battleStateChange", { to: "roundStart" });
    await wait(MANUAL_FALLBACK_DELAY_MS);
    emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
  } catch (err) {
    console.debug("Failed to dispatch startClicked", err);
  }
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

  const isTemplateHiddenAndUntracked =
    section.hasAttribute("hidden") && section.dataset.hiddenByCliShortcutsFlag === undefined;

  if (isTemplateHiddenAndUntracked) {
    section.dataset.hiddenByCliShortcutsFlag = "template";
  }
  const enabled = isEnabled("cliShortcuts");
  if (!enabled) {
    section.dataset.hiddenByCliShortcutsFlag = "flag";
    section.style.display = "none";
    if (state.shortcutsOverlay || !section.hasAttribute("hidden")) {
      hideCliShortcuts();
    }
    return;
  }

  section.style.display = "";
  if (section.dataset.hiddenByFlag) {
    delete section.dataset.hiddenByFlag;
  }

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

  const currentlyCollapsed = section.hasAttribute("hidden");
  const shouldCollapse = persistedCollapsed ?? currentlyCollapsed;

  if (shouldCollapse && !currentlyCollapsed) {
    hideCliShortcuts();
  } else if (!shouldCollapse && currentlyCollapsed) {
    showCliShortcuts();
  }
}

/**
 * Expand the CLI shortcuts panel.
 *
 * @pseudocode
 * if test hook `setShortcutsCollapsed(false)` returns false:
 *   show shortcuts section and body
 *   persist expanded state to localStorage
 *   set close button `aria-expanded` to true
 */
function showCliShortcuts() {
  if (!window.__battleCLIinit?.setShortcutsCollapsed?.(false)) {
    const body = byId("cli-shortcuts-body");
    const sec = byId("cli-shortcuts");
    const close = byId("cli-shortcuts-close");
    try {
      localStorage.setItem("battleCLI.shortcutsCollapsed", "0");
    } catch {}
    if (body) body.style.display = "";
    sec?.removeAttribute("hidden");
    close?.setAttribute("aria-expanded", "true");
    // Pause active timers while shortcuts overlay is open
    try {
      pauseTimers();
    } catch {}
    state.shortcutsOverlay = true;
  }
}

/**
 * Collapse the CLI shortcuts panel and restore focus.
 *
 * @pseudocode
 * if test hook `setShortcutsCollapsed(true)` returns false:
 *   hide shortcuts section and body
 *   persist collapsed state to localStorage
 *   set close button `aria-expanded` to false
 * if stored focus exists: focus it and clear reference
 */
function hideCliShortcuts() {
  if (!window.__battleCLIinit?.setShortcutsCollapsed?.(true)) {
    const body = byId("cli-shortcuts-body");
    const sec = byId("cli-shortcuts");
    const close = byId("cli-shortcuts-close");
    try {
      localStorage.setItem("battleCLI.shortcutsCollapsed", "1");
    } catch {}
    if (body) body.style.display = "none";
    if (sec) sec.setAttribute("hidden", "");
    close?.setAttribute("aria-expanded", "false");
  }
  // Resume timers when shortcuts overlay closes
  try {
    resumeTimers();
  } catch {}
  try {
    state.shortcutsReturnFocus?.focus();
  } catch {}
  state.shortcutsReturnFocus = null;
  state.shortcutsOverlay = null;
}

function showBottomLine(text) {
  if (!hasDocument) return;
  // Render as a single bottom line using the snackbar container
  try {
    // Lazily create a minimal snackbar child if missing
    const container = byId("snackbar-container");
    if (!container) return;
    let bar = container.querySelector(".snackbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "snackbar";
      container.appendChild(bar);
    }
    bar.setAttribute("tabindex", "0");
    bar.textContent = text || "";
    // Move focus to the prompt when showing actionable guidance so
    // screen-reader and keyboard users are directed appropriately.
    if (text) {
      try {
        bar.focus();
      } catch {}
    }
  } catch {}
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
 *
 * @pseudocode
 * container = document.getElementById("snackbar-container")
 * if container missing: return
 * create div.snackbar.show with sanitized message
 * append to container
 * timeoutId = setTimeout(remove bar, SNACKBAR_REMOVE_MS)
 * store timeoutId on bar
 * observe container for bar removal and clear timeout
 *
 * @param {string} text - Hint text to display.
 */
function showHint(text) {
  if (!hasDocument) return;
  const container = byId("snackbar-container");
  if (!container) return;
  const bar = document.createElement("div");
  bar.className = "snackbar show";
  bar.textContent = sanitizeHintText(text);
  container.appendChild(bar);
  const timeoutId = setTimeout(() => {
    if (bar && bar.parentNode) {
      bar.remove();
    }
  }, SNACKBAR_REMOVE_MS);
  // Store timeout on element to clean up if removed early
  bar._removeTimeoutId = timeoutId;
  // Use MutationObserver to detect removal of the snackbar bar
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      for (const removedNode of mutation.removedNodes) {
        if (removedNode === bar) {
          clearTimeout(bar._removeTimeoutId);
          observer.disconnect();
          return;
        }
      }
    }
  });
  observer.observe(container, { childList: true });
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
 * @param {"selection"|"cooldown"} type Timer category to pause.
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
    const bar = byId("snackbar-container")?.querySelector(".snackbar");
    const match = bar?.textContent?.match(/Next round in: (\d+)/);
    cooldownTimer = null;
    cooldownInterval = null;
    return match ? Number(match[1]) : null;
  }
}

/**
 * Pause active selection and cooldown timers, preserving remaining time.
 *
 * @pseudocode
 * newSelection = pauseTimer("selection")
 * if newSelection is not null:
 *   pausedSelectionRemaining = newSelection
 * newCooldown = pauseTimer("cooldown")
 * if newCooldown is not null:
 *   pausedCooldownRemaining = newCooldown
 */
function pauseTimers() {
  console.log("[TIMER] pauseTimers called");
  const newSelection = pauseTimer("selection");
  if (newSelection !== null) pausedSelectionRemaining = newSelection;
  const newCooldown = pauseTimer("cooldown");
  if (newCooldown !== null) pausedCooldownRemaining = newCooldown;
}

/**
 * Resume timers previously paused by `pauseTimers`.
 *
 * @pseudocode
 * if in waitingForPlayerAction and have selection remaining:
 *   startSelectionCountdown(remaining)
 * if in cooldown and have cooldown remaining:
 *   show bottom line and start interval/timeout
 * reset stored remaining values
 */
function resumeTimers() {
  if (!hasDocument) return;
  console.log("[TIMER] resumeTimers called");
  if (
    document.body?.dataset?.battleState === "waitingForPlayerAction" &&
    pausedSelectionRemaining
  ) {
    startSelectionCountdown(pausedSelectionRemaining);
  }
  if (document.body?.dataset?.battleState === "cooldown" && pausedCooldownRemaining) {
    let remaining = pausedCooldownRemaining;
    showBottomLine(`Next round in: ${remaining}`);
    try {
      cooldownInterval = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) showBottomLine(`Next round in: ${remaining}`);
      }, 1000);
    } catch {}
    try {
      cooldownTimer = setTimeout(() => {
        try {
          emitBattleEvent("countdownFinished");
        } catch {}
      }, remaining * 1000);
    } catch {}
  }
  pausedSelectionRemaining = null;
  pausedCooldownRemaining = null;
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
export function selectStat(stat) {
  if (typeof window !== "undefined" && window.__TEST__) {
    safeDispatch("statSelected");
    return;
  }
  if (!stat) return;
  // Ignore re-entrant calls while a selection is being applied
  if (selectionApplying || state.roundResolving) return;
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
    if (history[history.length - 1] !== stat) {
      history.push(stat);
      if (history.length > 20) {
        history.shift();
      }
      localStorage.setItem("cliStatHistory", JSON.stringify(history));
      commandHistory = history;
    }
    historyIndex = commandHistory.length;
  } catch {}
  showBottomLine(`You Picked: ${stat.charAt(0).toUpperCase()}${stat.slice(1)}`);
  try {
    state.roundResolving = true;
    // Dispatch the statSelected event to the state machine and emit the battle event
    emitBattleEvent("statSelected", { stat });
    const dispatchResult = safeDispatch("statSelected");
    const handleDispatchError = (err) => {
      console.error("Error dispatching statSelected", err);
    };
    if (dispatchResult && typeof dispatchResult.catch === "function") {
      dispatchResult.catch(handleDispatchError);
    } else {
      // Always wrap in Promise.resolve to preserve error handling for falsy values
      Promise.resolve(dispatchResult).catch(handleDispatchError);
    }
  } catch (err) {
    console.error("Error dispatching statSelected", err);
  } finally {
    // Allow future selections after dispatch has been initiated
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
  let remaining = seconds;
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
  if (!hint) return;
  let shortcutsEnabled = false;
  let statHotkeysEnabled = false;
  try {
    shortcutsEnabled = !!isEnabled("cliShortcuts");
  } catch {}
  try {
    statHotkeysEnabled = !!isEnabled("statHotkeys");
  } catch {}

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
  event.preventDefault();
  const idx = statDiv?.dataset?.statIndex;
  if (!idx) return;
  const doc = getSafeDocument();
  const state = doc?.body?.dataset?.battleState ?? "";
  if (state !== "waitingForPlayerAction") return;
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
    const saved = Number(storage.get());
    if (validTargets.has(saved)) {
      engineFacade.setPointsToWin?.(saved);
      select.value = String(saved);
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
      if (sec.hidden) {
        const activeElement = getActiveElement();
        state.shortcutsReturnFocus = activeElement instanceof HTMLElement ? activeElement : null;
        showCliShortcuts();
        byId("cli-shortcuts-close")?.focus();
      } else {
        hideCliShortcuts();
      }
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
    if (activeElement?.dataset?.statIndex) {
      const idx = activeElement.dataset.statIndex;
      if (idx) {
        const stat = getStatByIndex(idx);
        if (stat) {
          __scheduleMicrotask(() => selectStat(stat));
          return true;
        }
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
  handleCommandHistory
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
  roundOver: advanceRoundOver,
  cooldown: advanceCooldown
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
  if (shortcutsPanel && !shortcutsPanel.hidden) return;
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
      emitBattleEvent("countdownFinished");
      emitBattleEvent("round.start");
      skipHandled = true;
    }
  });
  if (skipEnabled && skipHandled) {
    return;
  }
  const ds = typeof document !== "undefined" ? document.body?.dataset : undefined;
  if (ds) ds.battleState = "cooldown";
  // Ensure score line reflects the resolved round before any user interaction
  try {
    updateScoreLine();
  } catch {}
  const duration = Number(e.detail?.duration) || 0;
  if (cooldownTimer) clearTimeout(cooldownTimer);
  if (cooldownInterval) clearInterval(cooldownInterval);
  cooldownTimer = null;
  cooldownInterval = null;
  if (duration > 0) {
    let remaining = duration;
    showBottomLine(`Next round in: ${remaining}`);
    cooldownInterval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) showBottomLine(`Next round in: ${remaining}`);
    }, 1000);
    cooldownTimer = setTimeout(() => {
      emitBattleEvent("countdownFinished");
    }, duration * 1000);
  } else {
    emitBattleEvent("countdownFinished");
  }
}

function handleCountdownFinished() {
  if (cooldownTimer) clearTimeout(cooldownTimer);
  if (cooldownInterval) clearInterval(cooldownInterval);
  cooldownTimer = null;
  cooldownInterval = null;
  clearBottomLine();
}

function handleRoundResolved(e) {
  state.roundResolving = false;
  const { result, stat, playerVal, opponentVal } = e.detail || {};
  if (result) {
    const display = statDisplayNames[stat] || String(stat || "").toUpperCase();
    setRoundMessage(`${result.message} (${display} – You: ${playerVal} Opponent: ${opponentVal})`);
    updateScoreLine();
    // Ensure cli-score is updated with the correct scores from the result
    const cliScore = hasDocument ? document.getElementById("cli-score") : null;
    if (cliScore) {
      // Prefer explicit values from the result when available, otherwise
      // fall back to the canonical engine scores to avoid writing "undefined".
      let playerScore = result.playerScore;
      let opponentScore = result.opponentScore;
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
      cliScore.textContent = `You: ${playerScore} Opponent: ${opponentScore}`;
      cliScore.dataset.scorePlayer = String(playerScore);
      cliScore.dataset.scoreOpponent = String(opponentScore);
    }
    // Add detailed info to verbose log if enabled
    if (isEnabled("cliVerbose")) {
      const verboseLog = byId("cli-verbose-log");
      if (verboseLog) {
        const round = Number(byId("cli-root")?.dataset.round || 0);
        const entry = `Round ${round}: ${result.message} (${display} – You: ${playerVal}, Opponent: ${opponentVal}). Scores: You ${result.playerScore}, Opponent ${result.opponentScore}\n`;
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
 * 2. Build a "Play again" button that resets the match and restarts on click.
 * 3. If a home link exists, append a "Return to lobby" anchor using its href.
 * 4. Append the controls section to the main container.
 */
function handleMatchOver() {
  if (!hasDocument) return;
  const main = byId("cli-main");
  if (!main || byId("play-again-button")) return;
  const section = document.createElement("section");
  section.className = "cli-block";
  const btn = createButton("Play again", {
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
    if (!hint) return;
    const shouldReveal = state === "waitingForPlayerAction";
    if (hint.hidden === !shouldReveal) return;
    hint.hidden = !shouldReveal;
  } catch {}
}

/**
 * Update UI elements based on the current battle state.
 *
 * @pseudocode
 * 1. Update state badge and remove transient Next button.
 * 2. Clear verbose log when match starts.
 * 3. Start or stop selection countdown depending on state.
 * 4. Show bottom line hint when waiting to continue.
 *
 * @param {string} state - New battle state.
 * @returns {void}
 */
function updateUiForState(state) {
  updateBattleStateBadge(state);
  syncControlsHintVisibility(state);
  if (hasDocument) {
    try {
      document.getElementById("next-round-button")?.remove();
    } catch {}
  }
  if (state === "matchStart") {
    clearVerboseLog();
  }
  if (state === "waitingForPlayerAction") {
    startSelectionCountdown(30);
    byId("cli-stats")?.focus();
  } else {
    stopSelectionCountdown();
  }
  if (state === "roundOver" && !autoContinue) {
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
  const { from, to } = ev.detail || {};
  updateUiForState(to);
  if (to === "roundOver" && !autoContinue) ensureNextRoundButton();
  if (verboseEnabled) logStateChange(from, to);
}

const battleEventHandlers = {
  // Phase 4: Removed scoreboardShowMessage and scoreboardClearMessage handlers
  // These are now handled by the shared Scoreboard adapter
  statSelectionStalled: handleStatSelectionStalled,
  countdownStart: handleCountdownStart,
  countdownFinished: handleCountdownFinished,
  roundResolved: handleRoundResolved,
  matchOver: handleMatchOver
};

function installEventBindings() {
  try {
    if (typeof onBattleEvent === "function") {
      Object.entries(battleEventHandlers).forEach(([event, handler]) =>
        onBattleEvent(event, handler)
      );
      onBattleEvent("battleStateChange", handleBattleState);
    }
  } catch {}
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
  const immersiveCheckbox = byId("immersive-toggle");

  const updateVerbose = () => {
    if (checkbox) checkbox.checked = !!verboseEnabled;
    if (section) {
      section.hidden = !verboseEnabled;
      // Update aria-expanded for accessibility
      section.setAttribute("aria-expanded", verboseEnabled ? "true" : "false");
    }
    const indicator = byId("verbose-indicator");
    if (indicator) {
      indicator.style.display = verboseEnabled ? "inline" : "none";
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
  ensureVerboseScrollHandling();
  refreshVerboseScrollIndicators();
  try {
    verboseEnabled = !!isEnabled("cliVerbose");
  } catch {}
  try {
    const immersiveEnabled = !!isEnabled("cliImmersive");
    document.body.classList.toggle("cli-immersive", immersiveEnabled);
    if (immersiveCheckbox) immersiveCheckbox.checked = immersiveEnabled;
  } catch {}
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
  updateStateBadgeVisibility();
  updateBattleStateBadge(getStateSnapshot().state);
  updateCliShortcutsVisibility();
  updateControlsHint();
  const close = byId("cli-shortcuts-close");
  close?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.ignoreNextAdvanceClick = true;
    hideCliShortcuts();
  });
  checkbox?.addEventListener("change", async () => {
    await toggleVerbose(!!checkbox.checked);
  });
  immersiveCheckbox?.addEventListener("change", async () => {
    await setFlag("cliImmersive", !!immersiveCheckbox.checked);
  });
  featureFlagsEmitter.addEventListener("change", (e) => {
    const flag = e.detail?.flag;
    if (!flag || flag === "cliVerbose") {
      try {
        verboseEnabled = !!isEnabled("cliVerbose");
      } catch {}
      const round = Number(byId("cli-root")?.dataset.round || 0);
      updateRoundHeader(round, engineFacade.getPointsToWin?.());
      updateVerbose();
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
    if (!flag || flag === "cliImmersive") {
      try {
        const immersiveEnabled = !!isEnabled("cliImmersive");
        document.body.classList.toggle("cli-immersive", immersiveEnabled);
        if (immersiveCheckbox) immersiveCheckbox.checked = immersiveEnabled;
      } catch {}
    }
    refreshVerboseScrollIndicators();
  });
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
  if (to === "waitingForPlayerAction") {
    hint.hidden = false;
  } else if (from === "waitingForPlayerAction") {
    hint.hidden = true;
  }
}

/**
 * Hide legacy CLI scoreboard nodes when the shared scoreboard replaces them.
 *
 * @summary Apply hidden state and descriptive ARIA labels to the legacy
 * scoreboard nodes after the shared scoreboard becomes active.
 *
 * @pseudocode
 * 1. Bail out when the DOM is unavailable.
 * 2. Iterate over the legacy node descriptors.
 * 3. Query each node by id; when found, hide it and set accessibility metadata.
 *
 * @returns {void}
 */
function hideLegacyScoreboardElements() {
  if (!hasDocument) return;

  const legacyElements = [
    { id: "cli-round", label: "Legacy round display (replaced by shared scoreboard)" },
    { id: "cli-score", label: "Legacy score display (replaced by shared scoreboard)" }
  ];

  legacyElements.forEach(({ id, label }) => {
    const element = document.getElementById(id);
    if (!element) return;

    element.style.display = "none";
    element.setAttribute("aria-hidden", "true");
    element.setAttribute("aria-label", label);
  });
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
 * 3. Attach keyboard and click handlers for advance controls.
 * 4. Register visibility lifecycle listeners to pause or resume timers.
 *
 * @returns {void}
 */
export function wireEvents() {
  installEventBindings();
  onBattleEvent("battleStateChange", handleBattleStateChange);
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", onKeyDown);
  }
  if (typeof document !== "undefined") {
    document.addEventListener("click", onClickAdvance);
    try {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          pauseTimers();
          // Also pause engine timer if available
          try {
            if (store?.engine?.handleTabInactive) {
              store.engine.handleTabInactive();
            }
          } catch (err) {
            console.log("[TIMER] Engine pause failed:", err.message);
          }
        } else {
          resumeTimers();
          // Also resume engine timer if available
          try {
            if (store?.engine?.handleTabActive) {
              store.engine.handleTabActive();
            }
          } catch (err) {
            console.log("[TIMER] Engine resume failed:", err.message);
          }
        }
      });
      if (typeof window !== "undefined") {
        window.addEventListener("pageshow", (ev) => {
          try {
            if (ev && ev.persisted) resumeTimers();
          } catch {}
        });
        window.addEventListener("pagehide", () => {
          try {
            pauseTimers();
          } catch {}
        });
      }
    } catch {}
  }
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
 * try initRoundSelectModal()
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
            emitBattleEvent("roundResolved", {});
          }

          const detail = { from: previousState, to: "roundOver", event: "roundResolved" };
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

  // Assign the engine to the store for debug access
  try {
    if (typeof engineFacade.getEngine === "function") {
      store.engine = engineFacade.getEngine();
    }
  } catch {}

  await resetMatch();
  await resetPromise;

  if (hasDocument) {
    let sharedScoreboardInitialized = false;

    // Phase 2: Initialize shared Scoreboard alongside CLI-specific logic
    try {
      // Setup shared Scoreboard component with timer controls
      const timerControls = {
        pauseTimer: () => {}, // CLI handles its own timers
        resumeTimer: () => {} // CLI handles its own timers
      };
      setupScoreboard(timerControls);

      // Initialize PRD battle scoreboard adapter for canonical events
      initBattleScoreboardAdapter();

      // Reveal standard scoreboard nodes (remove hidden state)
      const standardNodes = document.querySelector(".standard-scoreboard-nodes");
      if (standardNodes) {
        standardNodes.style.display = "block";
        standardNodes.removeAttribute("aria-hidden");
      }

      sharedScoreboardInitialized = true;
    } catch (error) {
      console.warn("Failed to initialize shared Scoreboard in CLI:", error);
    }

    if (sharedScoreboardInitialized) {
      hideLegacyScoreboardElements();
    }
  }

  let announceWithFocus = false;
  try {
    await initRoundSelectModal(startCallback);
  } catch {
    announceWithFocus = true;
  }

  if (announceWithFocus) {
    await announceMatchReady({ focusMain: true });
  } else {
    await announceMatchReady();
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
