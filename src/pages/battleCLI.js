// Classic Battle CLI bootstrap and controller
// Wires the existing Classic Battle engine/state machine to a terminal-style UI.

import {
  createBattleStore,
  startRound as startRoundCore,
  resetGame
} from "../helpers/classicBattle/roundManager.js";
import * as battleOrchestrator from "../helpers/classicBattle/orchestrator.js";
import { onBattleEvent, emitBattleEvent } from "../helpers/classicBattle/battleEvents.js";
import { STATS } from "../helpers/BattleEngine.js";
import * as engineFacade from "../helpers/battleEngineFacade.js";
import statNamesData from "../data/statNames.js";
import { createModal } from "../components/Modal.js";
import { createButton } from "../components/Button.js";
import {
  initFeatureFlags,
  isEnabled,
  setFlag,
  featureFlagsEmitter
} from "../helpers/featureFlags.js";
import {
  skipRoundCooldownIfEnabled,
  updateBattleStateBadge
} from "../helpers/classicBattle/uiHelpers.js";
import { getStateSnapshot } from "../helpers/classicBattle/battleDebug.js";
import { autoSelectStat } from "../helpers/classicBattle/autoSelectStat.js";
import { setTestMode } from "../helpers/testModeUtils.js";
import { wrap } from "../helpers/storage.js";
import { BATTLE_POINTS_TO_WIN } from "../config/storageKeys.js";
import { POINTS_TO_WIN_OPTIONS } from "../config/battleDefaults.js";
import * as debugHooks from "../helpers/classicBattle/debugHooks.js";
import { setAutoContinue, autoContinue } from "../helpers/classicBattle/orchestratorHandlers.js";
import { SNACKBAR_REMOVE_MS } from "../helpers/constants.js";

// Initialize engine and subscribe to engine events when available.
try {
  if (!window.__TEST__ && typeof engineFacade.createBattleEngine === "function") {
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
 * @pseudocode
 * 1. Try debugHooks channel first to get the live machine and call `dispatch`.
 * 2. Fallback to orchestrator's `dispatchBattleEvent` if available (when not mocked).
 * 3. Swallow any errors to keep CLI responsive during tests.
 */
async function safeDispatch(eventName, payload) {
  try {
    const getter = debugHooks?.readDebugState?.("getClassicBattleMachine");
    const m = typeof getter === "function" ? getter() : getter;
    if (m?.dispatch) {
      return payload === undefined
        ? await m.dispatch(eventName)
        : await m.dispatch(eventName, payload);
    }
  } catch {}
  try {
    const fn = battleOrchestrator?.dispatchBattleEvent;
    if (typeof fn === "function") {
      return payload === undefined ? await fn(eventName) : await fn(eventName, payload);
    }
  } catch {}
}

/**
 * Minimal DOM utils for the CLI page
 */
const byId = (id) => document.getElementById(id);

function getMachine() {
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
let quitModal = null;
let isQuitting = false;
let pausedSelectionRemaining = null;
let pausedCooldownRemaining = null;
let ignoreNextAdvanceClick = false;
let roundResolving = false;
let shortcutsReturnFocus = null;
let escapeHandledResolve;
let escapeHandledPromise = new Promise((r) => {
  escapeHandledResolve = r;
});

/**
 * Return a promise that resolves after the Escape key is handled.
 *
 * @pseudocode
 * return current `escapeHandledPromise`
 * @returns {Promise<void>} promise resolving when Escape logic finishes
 */
export function getEscapeHandledPromise() {
  return escapeHandledPromise;
}

/**
 * Resolve any pending Escape promise and create a new one.
 *
 * @pseudocode
 * IF `escapeHandledResolve` exists
 *   call `escapeHandledResolve`
 * ENDIF
 * create new promise assigning resolver to `escapeHandledResolve`
 */
function resolveEscapeHandled() {
  try {
    escapeHandledResolve?.();
  } catch {
    // Ignore if previous promise already settled
  }
  escapeHandledPromise = new Promise((r) => {
    escapeHandledResolve = r;
  });
}

try {
  window.__battleCLIinit = Object.assign(window.__battleCLIinit || {}, {
    getEscapeHandledPromise
  });
} catch {
  // Ignore in non-browser environments where `window` is undefined
}
const statDisplayNames = {};
let cachedStatDefs = null;

// Test hooks to access internal timer state
export const __test = {
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
  installEventBindings,
  autostartBattle,
  renderStatList,
  restorePointsToWin,
  startRoundWrapper,
  // Expose init for tests to manually initialize without DOMContentLoaded
  init,
  handleScoreboardShowMessage,
  handleScoreboardClearMessage,
  handleStatSelectionStalled,
  handleCountdownStart,
  handleCountdownFinished,
  handleRoundResolved,
  handleMatchOver,
  handleBattleState,
  onKeyDown
};
/**
 * Update the round counter line in the header.
 *
 * @pseudocode
 * if round element exists:
 *   set text to `Round ${round} Target: ${target} 🏆`
 * if root exists:
 *   set `data-round` and `data-target`
 */
function updateRoundHeader(round, target) {
  const el = byId("cli-round");
  if (el) el.textContent = `Round ${round} Target: ${target} 🏆`;
  const root = byId("cli-root");
  if (root) {
    root.dataset.round = String(round);
    root.dataset.target = String(target);
  }
}

function setRoundMessage(text) {
  const el = byId("round-message");
  if (el) el.textContent = text || "";
}

function updateScoreLine() {
  const { playerScore, opponentScore } = engineFacade.getScores?.() || {
    playerScore: 0,
    opponentScore: 0
  };
  const el = byId("cli-score");
  if (el) {
    el.textContent = `You: ${playerScore} Opponent: ${opponentScore}`;
    el.dataset.scorePlayer = String(playerScore);
    el.dataset.scoreOpponent = String(opponentScore);
  }
}

/**
 * Clear the verbose log output.
 *
 * @pseudocode
 * el = document.getElementById("cli-verbose-log")
 * if el exists:
 *   set textContent to ""
 */
function clearVerboseLog() {
  const el = byId("cli-verbose-log");
  if (el) el.textContent = "";
}

/**
 * Reset the match and reinitialize the battle orchestrator.
 *
 * @pseudocode
 * stopSelectionCountdown()
 * handleCountdownFinished()
 * roundResolving = false
 * clearVerboseLog()
 * remove play-again/start buttons
 * resetPromise = async () => {
 *   disposeClassicBattleOrchestrator()
 *   await resetGame(store)
 *   updateRoundHeader(0, engineFacade.getPointsToWin?.())
 *   updateScoreLine()
 *   setRoundMessage("")
 *   await initClassicBattleOrchestrator(store, startRoundWrapper)
 * }
 * await resetPromise
 */
let resetPromise = Promise.resolve();
async function resetMatch() {
  stopSelectionCountdown();
  handleCountdownFinished();
  roundResolving = false;
  clearVerboseLog();
  try {
    document.getElementById("play-again-button")?.remove();
    document.getElementById("start-match-button")?.remove();
  } catch {}
  const next = (async () => {
    disposeClassicBattleOrchestrator();
    await resetGame(store);
    updateRoundHeader(0, engineFacade.getPointsToWin?.());
    updateScoreLine();
    setRoundMessage("");
    await battleOrchestrator.initClassicBattleOrchestrator?.(store, startRoundWrapper);
  })();
  resetPromise = next;
  await next;
}

/**
 * Render the Start button after the orchestrator reset completes.
 *
 * @pseudocode
 * await resetPromise
 * if main missing or button exists → return
 * create section + button
 * on click → emit "startClicked" and dispatch to machine
 * remove section
 */
async function renderStartButton() {
  await resetPromise;
  const main = byId("cli-main");
  if (!main || byId("start-match-button")) return;
  const section = document.createElement("section");
  section.className = "cli-block";
  const btn = createButton("Start match", {
    id: "start-match-button",
    className: "primary-button"
  });
  btn.addEventListener("click", () => {
    try {
      // Notify UI/event listeners that start was clicked
      emitBattleEvent("startClicked");
    } catch {}
    try {
      const getter = debugHooks.readDebugState("getClassicBattleMachine");
      const machine = typeof getter === "function" ? getter() : getter;
      if (machine) machine.dispatch("startClicked");
    } catch (err) {
      console.debug("Failed to dispatch startClicked", err);
    }
    section.remove();
  });
  section.append(btn);
  main.append(section);
}

/**
 * Initialize deterministic seed input and validation.
 *
 * @pseudocode
 * read seed query param and localStorage
 * define apply(n): enable test mode and persist n
 * if query param numeric: apply and set input
 * else if stored seed numeric: populate input
 * lastValid <- numeric seed used or stored
 * on input change:
 *   if value is NaN:
 *     revert to lastValid and show error
 *   else:
 *     clear error, apply value, update lastValid
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
  let lastValid = null;
  // Only auto-enable test mode when an explicit seed query param is provided.
  if (seedParam !== null && seedParam !== "") {
    const num = Number(seedParam);
    if (!Number.isNaN(num)) {
      apply(num);
      if (input) input.value = String(num);
      lastValid = num;
    }
  } else if (storedSeed) {
    const num = Number(storedSeed);
    if (!Number.isNaN(num)) {
      // Populate the input from previous choice without enabling test mode implicitly.
      if (input) input.value = String(storedSeed);
      lastValid = num;
    }
  }
  input?.addEventListener("change", () => {
    const val = Number(input.value);
    if (input.value.trim() === "" || Number.isNaN(val)) {
      if (lastValid !== null) {
        input.value = String(lastValid);
      } else {
        input.value = "";
      }
      if (errorEl) errorEl.textContent = "Seed must be numeric.";
      return;
    }
    if (errorEl) errorEl.textContent = "";
    apply(val);
    lastValid = val;
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
 * if shortcuts section exists:
 *   set hidden to !isEnabled("cliShortcuts")
 */
function updateCliShortcutsVisibility() {
  const section = byId("cli-shortcuts");
  if (!section) return;
  if (!isEnabled("cliShortcuts")) {
    section.hidden = true;
    section.style.display = "none";
  } else {
    section.style.display = "";
    section.hidden = true;
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
  try {
    shortcutsReturnFocus?.focus();
  } catch {}
  shortcutsReturnFocus = null;
}

function showBottomLine(text) {
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
 * bar on DOMNodeRemoved: clear timeoutId
 *
 * @param {string} text - Hint text to display.
 */
function showHint(text) {
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
  bar.addEventListener("DOMNodeRemoved", function handler(e) {
    if (e.target === bar) {
      clearTimeout(bar._removeTimeoutId);
      bar.removeEventListener("DOMNodeRemoved", handler);
    }
  });
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
  let el = byId("modal-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "modal-container";
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Pause active selection and cooldown timers, preserving remaining time.
 *
 * @pseudocode
 * countdownEl = #cli-countdown
 * if selection timers exist:
 *   clear them and store remaining time from countdown dataset
 * if cooldown timers exist:
 *   clear them and parse remaining time from snackbar
 */
function pauseTimers() {
  const countdown = byId("cli-countdown");
  if (selectionTimer || selectionInterval) {
    try {
      if (selectionTimer) clearTimeout(selectionTimer);
    } catch {}
    try {
      if (selectionInterval) clearInterval(selectionInterval);
    } catch {}
    pausedSelectionRemaining = Number(countdown?.dataset?.remainingTime) || null;
    selectionTimer = null;
    selectionInterval = null;
  }
  const bar = byId("snackbar-container")?.querySelector(".snackbar");
  if (cooldownTimer || cooldownInterval) {
    try {
      if (cooldownTimer) clearTimeout(cooldownTimer);
    } catch {}
    try {
      if (cooldownInterval) clearInterval(cooldownInterval);
    } catch {}
    const match = bar?.textContent?.match(/Next round in: (\d+)/);
    pausedCooldownRemaining = match ? Number(match[1]) : null;
    cooldownTimer = null;
    cooldownInterval = null;
  }
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
      try {
        await safeDispatch("interrupt", { reason: "quit" });
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
  try {
    if (selectionTimer) clearTimeout(selectionTimer);
  } catch (err) {
    console.error("Failed to clear selectionTimer", err);
  }
  try {
    if (selectionInterval) clearInterval(selectionInterval);
  } catch (err) {
    console.error("Failed to clear selectionInterval", err);
  }
  selectionTimer = null;
  selectionInterval = null;
  const el = byId("cli-countdown");
  if (el) {
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
 * @pseudocode
 * stopSelectionCountdown()
 * clear pending selection timers and auto-select callbacks
 * highlight chosen stat
 * update store with selection
 * show bottom line with picked stat
 * set `roundResolving`
 * dispatch "statSelected" on machine
 */
function selectStat(stat) {
  if (!stat) return;
  stopSelectionCountdown();
  clearStoreTimer(store, "statTimeoutId");
  clearStoreTimer(store, "autoSelectId");
  const list = byId("cli-stats");
  list?.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
  const idx = STATS.indexOf(stat) + 1;
  if (list) list.dataset.selectedIndex = String(idx);
  const choiceEl = list?.querySelector(`[data-stat-index="${idx}"]`);
  choiceEl?.classList.add("selected");
  try {
    if (store) {
      store.playerChoice = stat;
      store.selectionMade = true;
    }
  } catch (err) {
    console.error("Failed to update player choice", err);
  }
  showBottomLine(`You Picked: ${stat.charAt(0).toUpperCase()}${stat.slice(1)}`);
  try {
    roundResolving = true;
    safeDispatch("statSelected");
  } catch (err) {
    console.error("Error dispatching statSelected", err);
  }
}

/**
 * Start a countdown for stat selection and handle expiry.
 *
 * @param {number} [seconds=5]
 * @pseudocode
 * stopSelectionCountdown()
 * set remaining=seconds and update countdown element
 * every 1s: decrement remaining and update element
 * after seconds: stop countdown and
 *   if autoSelect enabled: autoSelectStat(selectStat)
 *   else emit "statSelectionStalled"
 */
function startSelectionCountdown(seconds = 30) {
  const el = byId("cli-countdown");
  if (!el) return;
  stopSelectionCountdown();
  let remaining = seconds;
  // Use init helper if available to atomically update attribute+text for tests
  if (window.__battleCLIinit?.setCountdown) {
    window.__battleCLIinit.setCountdown(remaining);
  } else {
    el.dataset.remainingTime = String(remaining);
    el.textContent = `Time remaining: ${remaining}`;
  }
  try {
    selectionInterval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        if (window.__battleCLIinit?.setCountdown) window.__battleCLIinit.setCountdown(remaining);
        else {
          el.dataset.remainingTime = String(remaining);
          el.textContent = `Time remaining: ${remaining}`;
        }
      }
    }, 1000);
  } catch {}
  try {
    selectionTimer = setTimeout(() => {
      stopSelectionCountdown();
      if (isEnabled("autoSelect")) {
        autoSelectStat(selectStat);
      } else {
        try {
          emitBattleEvent("statSelectionStalled");
        } catch {}
      }
    }, seconds * 1000);
  } catch {}
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
      try {
        safeDispatch("startClicked");
      } catch {}
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
function handleStatListArrowKey(key) {
  const list = byId("cli-stats");
  const rows = list ? Array.from(list.querySelectorAll(".cli-stat")) : [];
  if (!list || rows.length === 0) return false;
  const current = document.activeElement?.closest?.(".cli-stat");
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
 * Load stat names and render them into the CLI stat selection list.
 *
 * @summary Load stat names, build stat buttons, store display name map, and wire click handlers.
 * @pseudocode
 * 1. Initialize cached stat definitions from the stat names module if not already loaded.
 * 2. Locate `#cli-stats`; clear existing entries and display name map.
 * 3. Render each stat as a clickable element showing `[idx] name: value` when `judoka` provided.
 * 4. Populate `#cli-help` once with index-name mapping and clear any skeleton placeholders.
 *
 * @param {object} [judoka] - Optional judoka object providing current stat values.
 * @returns {Promise<void>} Resolves when the stat list has been rendered.
 */
export async function renderStatList(judoka) {
  try {
    if (!cachedStatDefs) {
      // Prefer dynamic fetch in tests or when available so mocks can supply
      // custom stat sets (e.g., Speed/Strength). Fallback to bundled module.
      try {
        const { fetchJson } = await import("../helpers/dataUtils.js");
        const { DATA_DIR } = await import("../helpers/constants.js");
        const defs = await fetchJson(`${DATA_DIR}/statNames.json`);
        if (Array.isArray(defs) && defs.length) {
          cachedStatDefs = defs;
        }
      } catch {}
      if (!cachedStatDefs) cachedStatDefs = statNamesData;
    }
    const list = byId("cli-stats");
    const stats = Array.isArray(cachedStatDefs) ? cachedStatDefs : [];
    if (list && stats.length) {
      list.innerHTML = "";
      for (const key of Object.keys(statDisplayNames)) delete statDisplayNames[key];
      const rows = [];
      stats
        .slice()
        .sort((a, b) => (a.statIndex || 0) - (b.statIndex || 0))
        .forEach((s) => {
          const idx = Number(s.statIndex) || 0;
          if (!idx) return;
          const key = STATS[idx - 1];
          if (key) statDisplayNames[key] = s.name;
          const div = document.createElement("div");
          div.className = "cli-stat";
          div.id = `cli-stat-${idx}`;
          div.setAttribute("role", "button");
          div.setAttribute("tabindex", "-1");
          div.dataset.statIndex = String(idx);
          const val = Number(judoka?.stats?.[key]);
          div.textContent = Number.isFinite(val)
            ? `[${idx}] ${s.name}: ${val}`
            : `[${idx}] ${s.name}`;
          list.appendChild(div);
          rows.push(div);
        });
      if (rows.length) setActiveStatRow(rows[0], { focus: false });
      const onClick = handleStatListClick;
      const boundTargets = (globalThis.__battleCLIStatListBoundTargets ||= new WeakSet());
      if (!boundTargets.has(list)) {
        list.addEventListener("click", onClick);
        boundTargets.add(list);
      }
      try {
        window.__battleCLIinit?.clearSkeletonStats?.();
      } catch {}
      try {
        const help = byId("cli-help");
        if (help && help.childElementCount === 0) {
          const mapping = stats
            .slice()
            .sort((a, b) => (a.statIndex || 0) - (b.statIndex || 0))
            .map((s) => `[${s.statIndex}] ${s.name}`)
            .join("  ·  ");
          const li = document.createElement("li");
          li.textContent = mapping;
          help.appendChild(li);
        }
      } catch {}
    }
  } catch {}
}

function renderHiddenPlayerStats(judoka) {
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
 * 2. If a stored value is valid, apply it and update the select control.
 * 3. On user change: validate the chosen value, confirm reset, persist and reset when confirmed.
 *
 * @returns {void}
 */
export function restorePointsToWin() {
  try {
    const select = byId("points-select");
    if (!select) return;
    const storage = wrap(BATTLE_POINTS_TO_WIN, { fallback: "none" });
    const saved = Number(storage.get());
    if (POINTS_TO_WIN_OPTIONS.includes(saved)) {
      engineFacade.setPointsToWin?.(saved);
      select.value = String(saved);
    }
    const round = Number(byId("cli-root")?.dataset.round || 0);
    updateRoundHeader(round, engineFacade.getPointsToWin?.());
    let current = Number(select.value);
    select.addEventListener("change", async () => {
      const val = Number(select.value);
      if (!POINTS_TO_WIN_OPTIONS.includes(val)) return;
      if (window.confirm("Changing win target resets scores. Start a new match?")) {
        storage.set(val);
        await resetMatch();
        engineFacade.setPointsToWin?.(val);
        updateRoundHeader(0, val);
        renderStartButton();
        current = val;
      } else {
        select.value = String(current);
      }
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

function getStatByIndex(index1Based) {
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
 * if key is 'escape':
 *   close quit modal if open else hide shortcuts
 *   return true
 * if key is 'q':
 *   show quit confirmation modal
 *   return true
 * return false
 */
export function handleGlobalKey(key) {
  if (key === "h") {
    const sec = byId("cli-shortcuts");
    if (sec) {
      if (sec.hidden) {
        shortcutsReturnFocus =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        showCliShortcuts();
        byId("cli-shortcuts-close")?.focus();
      } else {
        hideCliShortcuts();
      }
    }
    return true;
  }
  if (key === "escape") {
    if (quitModal && !quitModal.element.hasAttribute("hidden")) {
      quitModal.close();
    } else {
      const sec = byId("cli-shortcuts");
      if (sec && !sec.hidden) hideCliShortcuts();
    }
    resolveEscapeHandled();
    return true;
  }
  if (key === "q") {
    showQuitModal();
    return true;
  }
  return false;
}

/**
 * Handle key presses while waiting for the player to select a stat.
 * @param {string} key
 * @pseudocode
 * if key is between '1' and '9':
 *   lookup stat by index
 *   if stat missing: return false
 *   selectStat(stat)
 *   return true
 * return false
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Handle key input while waiting for the player's stat selection.
 *
 * @summary Convert numeric key presses into stat selections when appropriate.
 * @param {string} key - Normalized single-character key value (e.g., '1').
 * @returns {boolean} True when the key was handled.
 * @pseudocode
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
  if (key >= "0" && key <= "9") {
    const stat = getStatByIndex(key);
    if (!stat) {
      showHint("Use 1-5, press H for help");
      return true;
    }
    selectStat(stat);
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
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
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
      safeDispatch("continue");
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
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Handle key input during cooldown between rounds.
 *
 * @summary Allow Enter/Space to skip cooldown, clear timers, and mark machine as ready.
 * @param {string} key - Normalized key value.
 * @returns {boolean} True when the key was handled.
 * @pseudocode
 * if key is Enter or Space:
 *   clear timers
 *   clear bottom line
 *   dispatch 'ready'
 *   return true
 * return false
 */
export function handleCooldownKey(key) {
  if (key === "enter" || key === " ") {
    try {
      if (cooldownTimer) clearTimeout(cooldownTimer);
    } catch {}
    try {
      if (cooldownInterval) clearInterval(cooldownInterval);
    } catch {}
    cooldownTimer = null;
    cooldownInterval = null;
    clearBottomLine();
    try {
      safeDispatch("ready");
    } catch {}
    return true;
  }
  return false;
}

/**
 * Global keyboard handler that routes input based on the current battle state.
 *
 * @summary Normalize keyboard events, run global handlers, then state-specific handlers.
 * @param {KeyboardEvent} e - Browser keyboard event.
 * @returns {void}
 * @pseudocode
 * key = lowercased key from event
 * if cliShortcuts disabled AND key != 'q': return
 * state = document.body.dataset.battleState
 * table = { waitingForPlayerAction: handleWaitingForPlayerActionKey,
 *           roundOver: handleRoundOverKey,
 *           cooldown: handleCooldownKey }
 * if key == "tab": return
 * handler = table[state]
 * handled = handleGlobalKey(key) OR (handler ? handler(key) : false)
 * countdown = element '#cli-countdown'
 * if not handled:
 *   if countdown exists: set text to "Invalid key, press H for help"
 * else if countdown has text:
 *   clear countdown text
 */
export function onKeyDown(e) {
  const key = e.key;
  const list = byId("cli-stats");
  if (
    list &&
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key) &&
    (list === document.activeElement || list.contains(document.activeElement))
  ) {
    e.preventDefault();
    handleStatListArrowKey(key);
    return;
  }
  const lower = key.toLowerCase();
  if (!isEnabled("cliShortcuts") && lower !== "q") return;
  const state = document.body?.dataset?.battleState || "";
  const table = {
    waitingForPlayerAction: handleWaitingForPlayerActionKey,
    roundOver: handleRoundOverKey,
    cooldown: handleCooldownKey
  };
  const handler = table[state];
  const handled = handleGlobalKey(lower) || (handler ? handler(lower) : false);
  const countdown = byId("cli-countdown");
  if (!handled && lower !== "tab") {
    // Added key !== "tab"
    if (countdown) countdown.textContent = "Invalid key, press H for help";
  } else if (countdown && countdown.textContent) {
    countdown.textContent = "";
  }
}

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
  const state = document.body?.dataset?.battleState || "";
  if (state !== "waitingForPlayerAction") return;
  const stat = getStatByIndex(idx);
  if (!stat) return;
  selectStat(stat);
}

/**
 * Advance battle state when clicking outside interactive areas.
 *
 * @pseudocode
 * if roundResolving or ignoreNextAdvanceClick -> return
 * state = body.dataset.battleState
 * if click inside .cli-stat or #cli-shortcuts -> return
 * if state == "roundOver" -> dispatch "continue"
 * else if state == "cooldown" -> clear timers, dispatch "ready"
 *
 * @param {MouseEvent} event - Click event.
 */
function onClickAdvance(event) {
  if (roundResolving) return;
  if (ignoreNextAdvanceClick) {
    // Consume exactly one background click after closing help.
    ignoreNextAdvanceClick = false;
    return;
  }
  // If help panel is open, ignore background clicks to avoid accidental advancement
  const shortcutsPanel = byId("cli-shortcuts");
  if (shortcutsPanel && !shortcutsPanel.hidden) return;
  let el = event.target;
  let path = [];
  while (el) {
    path.push(el.tagName + (el.id ? "#" + el.id : ""));
    el = el.parentElement;
  }
  const state = document.body?.dataset?.battleState || "";
  if (event.target?.closest?.(".cli-stat")) return;
  if (event.target?.closest?.("#cli-shortcuts")) return;
  if (state === "roundOver") {
    try {
      const machine = getMachine();
      if (machine) machine.dispatch("continue");
    } catch {}
  } else if (state === "cooldown") {
    try {
      if (cooldownTimer) clearTimeout(cooldownTimer);
    } catch {}
    try {
      if (cooldownInterval) clearInterval(cooldownInterval);
    } catch {}
    cooldownTimer = null;
    cooldownInterval = null;
    clearBottomLine();
    try {
      const machine = getMachine();
      if (machine) machine.dispatch("ready");
    } catch {}
  }
}

function handleScoreboardShowMessage(e) {
  setRoundMessage(String(e.detail || ""));
}

function handleScoreboardClearMessage() {
  setRoundMessage("");
}

function handleStatSelectionStalled() {
  if (!isEnabled("autoSelect")) {
    showBottomLine("Stat selection stalled. Pick a stat.");
  }
}

function handleCountdownStart(e) {
  if (skipRoundCooldownIfEnabled()) return;
  const ds = typeof document !== "undefined" ? document.body?.dataset : undefined;
  if (ds) ds.battleState = "cooldown";
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
  roundResolving = false;
  const { result, stat, playerVal, opponentVal } = e.detail || {};
  if (result) {
    const display = statDisplayNames[stat] || String(stat || "").toUpperCase();
    setRoundMessage(`${result.message} (${display} – You: ${playerVal} Opponent: ${opponentVal})`);
    updateScoreLine();
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
    emitBattleEvent("startClicked");
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

function handleBattleState(ev) {
  const { from, to } = ev.detail || {};
  updateBattleStateBadge(to);
  // Clean up any transient Next button when state changes
  try {
    const existing = document.getElementById("next-round-button");
    existing?.parentElement?.remove();
  } catch {}
  if (to === "matchStart") {
    clearVerboseLog();
  }
  if (to === "waitingForPlayerAction") {
    startSelectionCountdown(30);
    byId("cli-stats")?.focus();
  } else {
    stopSelectionCountdown();
  }
  if (to === "roundOver" && !autoContinue) {
    showBottomLine("Press Enter to continue");
    // Add an explicit, focusable Next button for pointer users
    try {
      const main = byId("cli-main");
      if (main && !document.getElementById("next-round-button")) {
        const section = document.createElement("section");
        section.className = "cli-block";
        const btn = document.createElement("button");
        btn.id = "next-round-button";
        btn.className = "primary-button";
        btn.textContent = "Next";
        btn.setAttribute("aria-label", "Continue to next round");
        btn.addEventListener("click", () => {
          try {
            // clear timers and UI hints similar to cooldown skip
            try {
              if (cooldownTimer) clearTimeout(cooldownTimer);
            } catch {}
            try {
              if (cooldownInterval) clearInterval(cooldownInterval);
            } catch {}
            cooldownTimer = null;
            cooldownInterval = null;
            clearBottomLine();
          } catch {}
          try {
            safeDispatch("continue");
          } catch {}
        });
        section.appendChild(btn);
        main.appendChild(section);
        // Focus the button so keyboard users land on it after round resolution
        try {
          btn.focus();
        } catch {}
      }
    } catch (err) {
      console.error("Failed to render next-round-button", err);
    }
  }
  if (!verboseEnabled) return;
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
  } catch {}
}

const battleEventHandlers = {
  scoreboardShowMessage: handleScoreboardShowMessage,
  scoreboardClearMessage: handleScoreboardClearMessage,
  statSelectionStalled: handleStatSelectionStalled,
  countdownStart: handleCountdownStart,
  countdownFinished: handleCountdownFinished,
  roundResolved: handleRoundResolved,
  matchOver: handleMatchOver
};

function installEventBindings() {
  Object.entries(battleEventHandlers).forEach(([event, handler]) => onBattleEvent(event, handler));
  onBattleEvent("battleStateChange", handleBattleState);
}

async function init() {
  console.log("init called");
  initSeed();
  store = createBattleStore();
  // Expose store for debug panels if needed
  try {
    window.battleStore = store;
  } catch {}
  await renderStatList();
  restorePointsToWin();
  // Initialize feature flags and verbose section
  const checkbox = byId("verbose-toggle");
  const section = byId("cli-verbose-section");
  const updateVerbose = () => {
    verboseEnabled = isEnabled("cliVerbose");
    if (checkbox) checkbox.checked = verboseEnabled;
    if (section) section.hidden = !verboseEnabled;
    if (verboseEnabled) {
      try {
        const pre = byId("cli-verbose-log");
        if (pre) pre.scrollTop = pre.scrollHeight;
      } catch {}
    }
  };

  /**
   * Toggle verbose flag while preserving win target.
   *
   * @pseudocode
   * 1. Read current points-to-win.
   * 2. Update verbose flag.
   * 3. Reapply points-to-win and refresh header.
   *
   * @param {boolean} enable
   * @returns {Promise<void>}
   */
  const toggleVerbose = async (enable) => {
    const target = engineFacade.getPointsToWin?.();
    await setFlag("cliVerbose", enable);
    engineFacade.setPointsToWin?.(target);
    const round = Number(byId("cli-root")?.dataset.round || 0);
    updateRoundHeader(round, target);
    updateVerbose();
  };
  try {
    await initFeatureFlags();
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
  const close = byId("cli-shortcuts-close");
  close?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    // Set a guard to ignore the next background click after closing help.
    // Do not clear it on microtask; it is consumed in onClickAdvance.
    ignoreNextAdvanceClick = true;
    hideCliShortcuts();
  });
  checkbox?.addEventListener("change", async () => {
    await toggleVerbose(!!checkbox.checked);
  });
  featureFlagsEmitter.addEventListener("change", (e) => {
    const flag = e.detail?.flag;
    if (!flag || flag === "cliVerbose") {
      const round = Number(byId("cli-root")?.dataset.round || 0);
      updateRoundHeader(round, engineFacade.getPointsToWin?.());
      updateVerbose();
    }
    if (!flag || flag === "battleStateBadge") {
      updateStateBadgeVisibility();
    }
    if (!flag || flag === "cliShortcuts") {
      updateCliShortcutsVisibility();
    }
  });
  // Install CLI event bridges
  installEventBindings();
  // Subscribe to engine events when provided by the facade.
  try {
    if (typeof engineFacade.on === "function") {
      engineFacade.on("timerTick", ({ remaining, phase }) => {
        if (phase === "round") {
          const el = byId("cli-timer");
          if (el) el.textContent = String(remaining);
        }
      });
      engineFacade.on("matchEnded", ({ outcome }) => {
        setRoundMessage(`Match over: ${outcome}`);
      });
    }
  } catch {}
  // Initialize orchestrator using our startRound wrapper
  await battleOrchestrator.initClassicBattleOrchestrator?.(store, startRoundWrapper);
  await renderStartButton();
  // Keyboard controls
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("click", onClickAdvance);
  // Pause/resume timers when the page visibility or lifecycle changes to avoid
  // double-firing timers when the tab is hidden / device sleeps.
  try {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseTimers();
      else resumeTimers();
    });
    // pageshow/pagehide help with bfcache and mobile sleep/resume semantics
    window.addEventListener("pageshow", (ev) => {
      // If the page was restored from the BFCache, ensure timers are resumed
      try {
        if (ev && ev.persisted) resumeTimers();
      } catch {}
    });
    window.addEventListener("pagehide", () => {
      try {
        pauseTimers();
      } catch {}
    });
  } catch {}
}

if (!window.__TEST__) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

// Expose for tests
if (typeof window !== "undefined") {
  window.__test = __test;
}
