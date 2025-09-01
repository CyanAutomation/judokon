// Classic Battle CLI bootstrap and controller
// Wires the existing Classic Battle engine/state machine to a terminal-style UI.

import {
  createBattleStore,
  startRound as startRoundCore,
  resetGame
} from "../helpers/classicBattle/roundManager.js";
import { initClassicBattleOrchestrator } from "../helpers/classicBattle/orchestrator.js";
import { onBattleEvent, emitBattleEvent } from "../helpers/classicBattle/battleEvents.js";
import { STATS } from "../helpers/BattleEngine.js";
import { setPointsToWin, getPointsToWin, getScores } from "../helpers/battleEngineFacade.js";
import { fetchJson } from "../helpers/dataUtils.js";
import { DATA_DIR } from "../helpers/constants.js";
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
import { dispatchBattleEvent } from "../helpers/classicBattle/orchestrator.js";
import { setAutoContinue, autoContinue } from "../helpers/classicBattle/orchestratorHandlers.js";

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
const statDisplayNames = {};

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
 *   set text to `Round ${round} of ${target}`
 * set `data-round` on root element
 */
function updateRoundHeader(round, target) {
  const el = byId("cli-round");
  if (el) el.textContent = `Round ${round} of ${target}`;
  const root = byId("cli-root");
  if (root) root.dataset.round = String(round);
}

function setRoundMessage(text) {
  const el = byId("round-message");
  if (el) el.textContent = text || "";
}

function updateScoreLine() {
  const { playerScore, opponentScore } = getScores();
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

async function resetMatch() {
  stopSelectionCountdown();
  handleCountdownFinished();
  roundResolving = false;
  clearVerboseLog();
  try {
    document.getElementById("play-again-button")?.remove();
    document.getElementById("start-match-button")?.remove();
  } catch {}
  await resetGame(store);
  updateRoundHeader(0, getPointsToWin());
  updateScoreLine();
  setRoundMessage("");
}

function renderStartButton() {
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

function initSeed() {
  const input = byId("seed-input");
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
    // Populate the input from previous choice without enabling test mode implicitly.
    if (input) input.value = String(storedSeed);
  }
  input?.addEventListener("change", () => {
    const val = Number(input.value);
    if (!Number.isNaN(val)) {
      apply(val);
    }
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
  } catch {}
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
        await dispatchBattleEvent("interrupt", { reason: "quit" });
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
    dispatchBattleEvent("statSelected");
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
  // Ensure autostart so the modal is skipped in CLI and dispatch start
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("autostart") !== "1") {
      url.searchParams.set("autostart", "1");
      history.replaceState({}, "", url);
    }
  } catch {}
  try {
    const autostart = new URLSearchParams(location.search).get("autostart");
    if (autostart === "1") {
      try {
        dispatchBattleEvent("startClicked");
      } catch {}
    }
  } catch {}
}

/**
 * Load stat names and render them into the CLI stat selection list.
 *
 * @summary Fetch `statNames.json`, build stat buttons, store display name map, and wire click handlers.
 * @pseudocode
 * 1. Fetch `statNames.json` and locate `#cli-stats`.
 * 2. Reset `statDisplayNames` and map `STATS[idx-1] -> name`.
 * 3. Sort and render stat entries into clickable elements with `data-stat-index`.
 * 4. Attach `handleStatClick` to the list and populate help text when available.
 *
 * @returns {Promise<void>} Resolves when the stat list has been rendered.
 */
export async function renderStatList() {
  try {
    const stats = await fetchJson(`${DATA_DIR}statNames.json`);
    const list = byId("cli-stats");
    if (list && Array.isArray(stats)) {
      list.innerHTML = "";
      for (const key of Object.keys(statDisplayNames)) delete statDisplayNames[key];
      stats
        .sort((a, b) => (a.statIndex || 0) - (b.statIndex || 0))
        .forEach((s) => {
          const idx = Number(s.statIndex) || 0;
          if (!idx) return;
          const key = STATS[idx - 1];
          if (key) statDisplayNames[key] = s.name;
          const div = document.createElement("div");
          div.className = "cli-stat";
          div.setAttribute("role", "button");
          div.setAttribute("tabindex", "0");
          div.dataset.statIndex = String(idx);
          div.textContent = `[${idx}] ${s.name}`;
          list.appendChild(div);
        });
      list.addEventListener("click", handleStatClick);
      // Clear skeleton placeholders if the init helper inserted them
      try {
        window.__battleCLIinit?.clearSkeletonStats?.();
      } catch {}
      try {
        const help = byId("cli-help");
        if (help) {
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
      setPointsToWin(saved);
      select.value = String(saved);
    }
    let current = Number(select.value);
    select.addEventListener("change", () => {
      const val = Number(select.value);
      if (!POINTS_TO_WIN_OPTIONS.includes(val)) return;
      if (window.confirm("Changing win target resets scores. Start a new match?")) {
        storage.set(val);
        setPointsToWin(val);
        resetMatch();
        renderStartButton();
        current = val;
      } else {
        select.value = String(current);
      }
    });
  } catch {}
}

function renderHiddenPlayerStats(judoka) {
  // Provide a hidden #player-card with li.stat value spans so engine guards can read values.
  let container = byId("player-card");
  if (!container) {
    container = document.createElement("div");
    container.id = "player-card";
    container.style.display = "none";
    document.body.appendChild(container);
  }
  const ul = document.createElement("ul");
  for (const stat of STATS) {
    const li = document.createElement("li");
    li.className = "stat";
    const span = document.createElement("span");
    const val = Number(judoka?.stats?.[stat]) || 0;
    span.textContent = String(val);
    li.appendChild(span);
    ul.appendChild(li);
  }
  container.replaceChildren(ul);
}

/**
 * Start a new round and prepare the CLI UI.
 *
 * @pseudocode
 * call core startRound → { judoka, roundNumber }
 * renderHiddenPlayerStats(judoka)
 * remove any `.selected` stat classes
 * clear round message and show prompt
 * update round header with roundNumber and points target
 */
async function startRoundWrapper() {
  // Use the core startRound to select judoka; capture results and prepare hidden values.
  const { playerJudoka, roundNumber } = await startRoundCore(store);
  currentPlayerJudoka = playerJudoka || null;
  if (currentPlayerJudoka) renderHiddenPlayerStats(currentPlayerJudoka);
  // Reset selections and prompt user for input
  const list = byId("cli-stats");
  list?.querySelectorAll(".selected").forEach((el) => el.classList.remove("selected"));
  setRoundMessage("");
  showBottomLine("Select your move");
  updateRoundHeader(roundNumber, getPointsToWin());
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
 *   toggle shortcuts visibility
 *   return true
 * if key is 'q':
 *   show quit confirmation modal
 *   return true
 * return false
 */
export function handleGlobalKey(key) {
  if (key === "h") {
    const sec = byId("cli-shortcuts");
    if (sec) sec.hidden = !sec.hidden;
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
 * @returns {boolean} True when the key was handled and resulted in a selection.
 * @pseudocode
 * if key is between '1' and '9':
 *   lookup stat by index
 *   if stat missing: return false
 *   selectStat(stat)
 *   return true
 * return false
 */
export function handleWaitingForPlayerActionKey(key) {
  if (key >= "1" && key <= "9") {
    const stat = getStatByIndex(key);
    if (!stat) return false;
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
      dispatchBattleEvent("continue");
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
      dispatchBattleEvent("ready");
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
  const key = e.key.toLowerCase();
  if (!isEnabled("cliShortcuts") && key !== "q") return;
  const state = document.body?.dataset?.battleState || "";
  const table = {
    waitingForPlayerAction: handleWaitingForPlayerActionKey,
    roundOver: handleRoundOverKey,
    cooldown: handleCooldownKey
  };
  const handler = table[state];
  const handled = handleGlobalKey(key) || (handler ? handler(key) : false);
  const countdown = byId("cli-countdown");
  if (!handled && key !== "tab") {
    // Added key !== "tab"
    if (countdown) countdown.textContent = "Invalid key, press H for help";
  } else if (countdown && countdown.textContent) {
    countdown.textContent = "";
  }
}

function handleStatClick(event) {
  const idx = event.target?.dataset?.statIndex;
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
  main.append(section);
}

function handleBattleState(ev) {
  const { from, to } = ev.detail || {};
  updateBattleStateBadge(to);
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
    byId("snackbar-container")?.querySelector(".snackbar")?.focus();
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
  try {
    await initFeatureFlags();
  } catch {}
  setAutoContinue(true);
  try {
    const params = new URLSearchParams(location.search);
    if (params.has("verbose")) {
      const v = params.get("verbose");
      await setFlag("cliVerbose", v === "1" || v === "true");
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
    const sec = byId("cli-shortcuts");
    if (sec) sec.hidden = true;
  });
  checkbox?.addEventListener("change", async () => {
    await setFlag("cliVerbose", !!checkbox.checked);
    updateVerbose();
  });
  featureFlagsEmitter.addEventListener("change", (e) => {
    const flag = e.detail?.flag;
    if (!flag || flag === "cliVerbose") {
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
  // Initialize orchestrator using our startRound wrapper
  await initClassicBattleOrchestrator(store, startRoundWrapper);
  renderStartButton();
  // Keyboard controls
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("click", onClickAdvance);
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
