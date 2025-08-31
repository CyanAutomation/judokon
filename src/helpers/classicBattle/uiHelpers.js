import { getOpponentCardData } from "./opponentController.js";
import { isEnabled, featureFlagsEmitter } from "../featureFlags.js";
import { getScores, getTimerState, isMatchEnded, STATS } from "../battleEngineFacade.js";
import { isTestModeEnabled, getCurrentSeed, setTestMode } from "../testModeUtils.js";
import { JudokaCard } from "../../components/JudokaCard.js";
import { setupLazyPortraits } from "../lazyPortrait.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import * as scoreboard from "../setupScoreboard.js";
import { showResult } from "../battle/index.js";
import { shouldReduceMotionSync } from "../motionUtils.js";
import { onFrame as scheduleFrame, cancel as cancelFrame } from "../../utils/scheduler.js";
import { handleStatSelection } from "./selectionHandler.js";
import { getCardStatValue } from "./cardStatUtils.js";
import { onNextButtonClick } from "./timerService.js";
import { loadStatNames } from "../stats.js";
import { toggleViewportSimulation } from "../viewportDebug.js";
import { toggleInspectorPanels } from "../cardUtils.js";
import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
import { syncScoreDisplay } from "./uiService.js";
import { onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import * as battleEvents from "./battleEvents.js";
import {
  resetStatButtonsReadyPromise,
  setStatButtonsEnabled,
  createStatHotkeyHandler
} from "./statButtons.js";
import { guard } from "./guard.js";

/**
 * Skip the inter-round cooldown when the corresponding feature flag is enabled.
 *
 * @pseudocode
 * 1. Exit early if the `skipRoundCooldown` flag is disabled.
 * 2. Schedule a microtask that emits `countdownFinished`.
 * 3. Return `true` when the cooldown will be skipped.
 *
 * @returns {boolean} `true` if the cooldown was skipped.
 */
export function skipRoundCooldownIfEnabled() {
  if (!isEnabled("skipRoundCooldown")) return false;
  const run = () => {
    try {
      // Emit via module namespace so spies observe the call
      battleEvents.emitBattleEvent("countdownFinished");
    } catch {}
  };
  try {
    queueMicrotask(run);
  } catch {
    setTimeout(run, 0);
  }
  return true;
}

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
      try {
        window.__promiseEvents = window.__promiseEvents || [];
        window.__promiseEvents.push({ type: "statButtonsReady-initialized", ts: Date.now() });
      } catch {}
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Prompt the player to select a stat via snackbar and clear round message.
 *
 * @pseudocode
 * 1. Clear `#round-message` text if present.
 * 2. Show a snackbar prompting the player to select a move.
 * 3. Emit a `roundPrompt` battle event for listeners.
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
export function showSelectionPrompt() {
  const el = document.getElementById("round-message");
  if (el) {
    el.textContent = "";
  }
  showSnackbar(t("ui.selectMove"));
  emitBattleEvent("roundPrompt");
  try {
    if (isTestModeEnabled()) console.warn("[test] roundPrompt emitted");
  } catch {}
}

/**
 * showRoundOutcome already has pseudocode above — placeholder stub for consistency.
 * @pseudocode
 * 1. Render the result across scoreboard and snackbar.
 */

// ...generated JSDoc stubs inserted below for exported symbols that lacked them
/**
 * @pseudocode
 * 1. Ensure the round message element is cleared and prompt is shown.
 */
// (showSelectionPrompt already documented above)

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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Render the opponent's Judoka card into a container.
 *
 * @pseudocode
 * 1. Validate inputs and construct a `JudokaCard` instance with `judoka` and `lookup`.
 * 2. Call `render()` and append the resulting node to `container`.
 * 3. Preserve and reattach the debug panel if present and initialize lazy portraits.
 *
 * @param {object} judoka
 * @param {HTMLElement|null} container
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

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Enable and mark the Next-round UI button as ready.
 *
 * @pseudocode
 * 1. Find `#next-button` and enable it.
 * 2. Set `data-next-ready` attribute to "true".
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
export function enableNextRoundButton() {
  const btn = document.getElementById("next-button");
  if (!btn) return;
  btn.disabled = false;
  btn.dataset.nextReady = "true";
}

/**
 * Mark the Next round button ready and enabled.
 *
 * @pseudocode
 * 1. Locate `#next-button` in the DOM.
 * 2. If present, set `disabled=false` and `data-next-ready=true`.
 */

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Disable the Next-round UI button and clear ready state.
 *
 * @pseudocode
 * 1. Find `#next-button` and disable it.
 * 2. Remove `data-next-ready` attribute.
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
export function disableNextRoundButton() {
  const btn = document.getElementById("next-button");
  if (!btn) return;
  btn.disabled = true;
  delete btn.dataset.nextReady;
}

/**
 * Synchronously collect machine/counters useful for debugging the state machine.
 *
 * @pseudocode
 * 1. Read and return machine globals such as current state, prev state and log.
 */

/**
 * Extract machine state and diagnostics from a window object.
 *
 * @pseudocode
 * 1. Exit with `{}` if `win` lacks machine globals.
 * 2. Copy current, previous, last event, and state log values.
 * 3. Append round decision and guard diagnostics when present.
 * 4. Merge machine readiness and triggers via `addMachineDiagnostics`.
 * 5. Return accumulated machine info.
 *
 * @param {Window | null} win Source window.
 * @returns {object}
 */
export function getMachineDebugState(win) {
  const state = {};
  try {
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
  return state;
}

/**
 * Create a minimal snapshot of the battle store.
 *
 * @pseudocode
 * 1. Exit with `{}` when `win.battleStore` is missing.
 * 2. Capture `selectionMade` and `playerChoice` values.
 * 3. Wrap results in a `store` object and return.
 *
 * @param {Window | null} win Source window.
 * @returns {object}
 */
export function getStoreSnapshot(win) {
  const out = {};
  try {
    const store = win?.battleStore;
    if (store) {
      out.store = {
        selectionMade: !!store.selectionMade,
        playerChoice: store.playerChoice || null
      };
    }
  } catch {}
  return out;
}

/**
 * Gather build metadata and DOM status from a window object.
 *
 * @pseudocode
 * 1. Exit with `{}` if `win` is missing.
 * 2. Copy build tag, round number, and clone event debug array.
 * 3. Record `#opponent-card` child count when the element exists.
 * 4. Return the assembled build info.
 *
 * @param {Window | null} win Source window.
 * @returns {object}
 */
export function getBuildInfo(win) {
  const info = {};
  try {
    if (win?.__buildTag) info.buildTag = win.__buildTag;
    if (win?.__roundDebug) info.round = win.__roundDebug;
    if (Array.isArray(win?.__eventDebug)) info.eventDebug = win.__eventDebug.slice();
    const opp = win?.document?.getElementById("opponent-card");
    if (opp) {
      info.dom = {
        opponentChildren: opp.children ? opp.children.length : 0
      };
    }
  } catch {}
  return info;
}

/**
 * Gather scores, timer details, and machine diagnostics for the debug panel.
 *
 * @pseudocode
 * 1. Initialize state with scores, timer, and match end flag.
 * 2. Add test seed when test mode is active.
 * 3. Merge machine diagnostics via `getMachineDebugState`.
 * 4. Merge store snapshot via `getStoreSnapshot`.
 * 5. Merge build info via `getBuildInfo`.
 * 6. Return accumulated state.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Collect a snapshot of scores, timer and machine diagnostics for debug panel.
 *
 * @pseudocode
 * 1. Read scores, timer state and matchEnded flag from engine facades.
 * 2. Add test seed when in test mode.
 * 3. Merge machine diagnostics, store snapshot and build info.
 * 4. Return the aggregated debug state object.
 *
 * @returns {object}
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
    ...getMachineDebugState(win),
    ...getStoreSnapshot(win),
    ...getBuildInfo(win)
  };
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
 * 2. Stringify `state` without indentation for compact output.
 * 3. Assign result to `pre.textContent`.
 *
 * @param {HTMLElement | null} pre Target element to update.
 * @param {object} state Debug state object to render.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Render the debug `state` JSON into a `<pre>` element.
 *
 * @pseudocode
 * 1. If `pre` is missing, return early.
 * 2. Stringify `state` compactly and assign to `pre.textContent`.
 *
 * @param {HTMLElement|null} pre
 * @param {object} state
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
export function renderDebugState(pre, state) {
  if (!pre) return;
  // Use compact JSON to remove line breaks for AI-friendly copying.
  pre.textContent = JSON.stringify(state);
}

/**
 * Update the debug panel with current game metrics and diagnostics.
 *
 * @pseudocode
 * 1. Obtain `#debug-output` element; exit if absent.
 * 2. Collect state via `collectDebugState`.
 * 3. Render the state with `renderDebugState`.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Update the debug panel output with current debug state.
 *
 * @pseudocode
 * 1. Locate `#debug-output` element and exit if missing.
 * 2. Collect debug state and render it into the element.
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Display a round outcome across scoreboard and snackbar.
 *
 * @pseudocode
 * 1. Call `showResult` to render the result.
 * 2. Show the outcome in the scoreboard and optionally in snackbar.
 *
 * @param {string} message
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
export function showRoundOutcome(message) {
  showResult(message);
  scoreboard.showMessage(message, { outcome: true });
  // Outcome messages belong in the round message region; avoid using snackbar
  // here so countdowns and hints can occupy it consistently.
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Animate or immediately update stat comparison values in the UI.
 *
 * @pseudocode
 * 1. Locate `#round-result` element; exit if missing.
 * 2. Cancel any previous RAF and either update immediately (reduced motion)
 *    or animate values using scheduler frames over ~500ms.
 * 3. Store RAF id on `store.compareRaf` for cancellation.
 *
 * @param {object} store
 * @param {string} stat
 * @param {number} playerVal
 * @param {number} compVal
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Observe device orientation/resize and run `callback` to apply orientation.
 *
 * @pseudocode
 * 1. Expose `window.applyBattleOrientation` which invokes `callback`.
 * 2. Poll via RAF until `callback` reports success.
 * 3. Attach listeners for `orientationchange` and `resize` and throttle via RAF.
 *
 * @param {() => Promise<boolean>} callback
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Wire the Next button's click handler to `onNextButtonClick`.
 *
 * @pseudocode
 * 1. Find `#next-button` and attach event listener for `click`.
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
export function setupNextButton() {
  const btn = document.getElementById("next-button");
  if (!btn) return;
  btn.addEventListener("click", onNextButtonClick);
}

/**
 * Programmatically select a stat as if the user clicked the button.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store
 * @param {string} stat
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Programmatically select a stat as if the user clicked its button.
 *
 * @pseudocode
 * 1. Find the stat button and infer a label.
 * 2. Update visual state and disable all stat buttons.
 * 3. Invoke selection handler and show a snackbar message.
 *
 * @param {object} store
 * @param {string} stat
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
export function selectStat(store, stat) {
  const btn = document.querySelector(`#stat-buttons [data-stat='${stat}']`);
  // derive label from button text if available
  const label = btn?.textContent?.trim() || stat.charAt(0).toUpperCase() + stat.slice(1);
  // best-effort visual state
  try {
    const container = document.getElementById("stat-buttons");
    container?.querySelectorAll("button").forEach((b) => (b.disabled = true));
    btn?.classList.add("selected");
  } catch {}
  // read values from cards
  const pCard = document.getElementById("player-card");
  const oCard = document.getElementById("opponent-card");
  const playerVal = getCardStatValue(pCard, stat);
  const opponentVal = getCardStatValue(oCard, stat);
  // fire selection and snackbar
  try {
    Promise.resolve(handleStatSelection(store, stat, { playerVal, opponentVal })).catch(() => {});
  } catch {}
  try {
    showSnackbar(`You Picked: ${label}`);
  } catch {}
}

/**
 * Remove modal backdrops and destroy the current quit modal.
 *
 * @pseudocode
 * 1. Remove all `.modal-backdrop` elements.
 * 2. Destroy and nullify `store.quitModal` when present.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} [store]
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Remove modal backdrops and destroy any active quit modal.
 *
 * @pseudocode
 * 1. Remove all elements matching `.modal-backdrop`.
 * 2. Destroy `store.quitModal` when present and nullify the reference.
 *
 * @param {object} [store]
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
export function removeBackdrops(store) {
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
}

/**
 * Replace the Next button with a fresh disabled clone and wire the click handler.
 *
 * @pseudocode
 * 1. Locate `#next-button`.
 * 2. Clone it, disable the clone, remove `data-next-ready`, and add `onNextButtonClick`.
 * 3. Replace the original button with the clone.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Replace the Next button with a fresh disabled clone and rewire handlers.
 *
 * @pseudocode
 * 1. Locate existing `#next-button`, clone it and disable the clone.
 * 2. Attach `onNextButtonClick` to the clone and replace the original.
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
export function resetNextButton() {
  let nextBtn;
  try {
    nextBtn = document.getElementById ? document.getElementById("next-button") : null;
  } catch {}
  if (nextBtn) {
    const clone = nextBtn.cloneNode(true);
    clone.disabled = true;
    delete clone.dataset.nextReady;
    clone.addEventListener("click", onNextButtonClick);
    nextBtn.replaceWith(clone);
  }
}

/**
 * Replace the Quit button with a fresh clone to drop existing listeners.
 *
 * @pseudocode
 * 1. Locate `#quit-match-button`.
 * 2. Replace it with an inert clone.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Replace the Quit button with an inert clone to drop existing listeners.
 *
 * @pseudocode
 * 1. Locate `#quit-match-button` and replace it with `cloneNode(true)`.
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
export function resetQuitButton() {
  let quitBtn;
  try {
    quitBtn = document.getElementById ? document.getElementById("quit-match-button") : null;
  } catch {}
  if (quitBtn) {
    quitBtn.replaceWith(quitBtn.cloneNode(true));
  }
}

/**
 * Clear scoreboard and round messages, then synchronize the score display.
 *
 * @pseudocode
 * 1. Clear scoreboard message and timer.
 * 2. Empty `#round-result` text.
 * 3. Invoke `syncScoreDisplay`.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Clear scoreboard messages and timers, and synchronize the score display.
 *
 * @pseudocode
 * 1. Clear scoreboard message and timer.
 * 2. Empty `#round-result` text and call `syncScoreDisplay()`.
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
export function clearScoreboardAndMessages() {
  try {
    scoreboard.clearMessage();
  } catch {}
  try {
    scoreboard.clearTimer();
  } catch {}
  let roundResultEl;
  try {
    roundResultEl = document.getElementById ? document.getElementById("round-result") : null;
  } catch {}
  if (roundResultEl) roundResultEl.textContent = "";
  try {
    syncScoreDisplay();
  } catch {}
}

/**
 * Initialize stat selection buttons.
 *
 * @pseudocode
 * 1. Gather all stat buttons inside `#stat-buttons`.
 * 2. Define `setEnabled` to toggle disabled state, tabindex and `data-buttons-ready`.
 * 3. Resolve `window.statButtonsReadyPromise` when buttons are enabled; reset when disabled.
 * 4. On click or Enter/Space, disable all buttons and handle selection.
 * 5. Return controls to enable/disable the group.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - Battle store.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Initialize stat selection buttons with click/keyboard handlers and expose controls.
 *
 * @pseudocode
 * 1. Locate `#stat-buttons` and wire click/keydown handlers for each button.
 * 2. Implement `setEnabled` to toggle button enabled state and resolve a global readiness promise.
 * 3. Return an API `{ enable, disable }`.
 *
 * @param {object} store
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
export function initStatButtons(store) {
  const statButtons = document.querySelectorAll("#stat-buttons button");
  const statContainer = document.getElementById("stat-buttons");
  let resolveReady = typeof window !== "undefined" ? window.__resolveStatButtonsReady : undefined;
  const resetReadyPromise = () => {
    ({ resolve: resolveReady } = resetStatButtonsReadyPromise());
  };

  const setEnabled = (enable = true) =>
    setStatButtonsEnabled(statButtons, statContainer, enable, resolveReady, resetReadyPromise);

  // Start disabled until the game enters the player action state
  resetReadyPromise();
  setEnabled(false);

  statButtons.forEach((btn) => {
    const statName = btn.dataset.stat;
    const clickHandler = () => {
      if (btn.disabled) return;
      // Invoke selection logic immediately so tests observing the call
      // don't need to wait for animation frames. Keep visual updates
      // deferred to the next frame to avoid mid-dispatch UI changes.
      guard(() => {
        Promise.resolve(handleStatSelection(store, statName)).catch(() => {});
      });
      // Show snackbar immediately so tests and observers can see the message
      // synchronously.
      guard(() => {
        const label = String(btn.textContent || "").trim();
        showSnackbar(t("ui.youPicked", { stat: label }));
      });
      // Disable buttons right away; selected class is applied via the
      // 'statSelected' event to keep a single source of truth.
      guard(() => setEnabled(false));
    };
    btn.addEventListener("click", clickHandler);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        clickHandler();
      }
    });
  });

  // Optional keyboard shortcuts (1..5) behind feature flag `statHotkeys`
  const handleHotkeys = createStatHotkeyHandler(statButtons);
  guard(() => document.addEventListener("keydown", handleHotkeys));

  return {
    enable: () => setEnabled(true),
    disable: () => setEnabled(false)
  };
}

/**
 * Apply localized stat labels to selection buttons.
 *
 * @pseudocode
 * 1. Load stat names via `loadStatNames`.
 * 2. Map each name to the corresponding button's text and aria-label.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Apply localized stat labels to stat selection buttons.
 *
 * @pseudocode
 * 1. Load stat names and map each to the corresponding button text and aria-label.
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
      // Provide a short, hidden description to screen readers without requiring tooltip open
      try {
        const descId = `stat-desc-${key}`;
        let desc = document.getElementById(descId);
        if (!desc) {
          desc = document.createElement("span");
          desc.id = descId;
          desc.className = "visually-hidden";
          desc.textContent = t(`stat.desc.${key}`);
          const group = document.getElementById("stat-buttons");
          group?.appendChild(desc);
        }
        btn.setAttribute("aria-describedby", descId);
      } catch {}
    }
  });
}

/**
 * Update the text content of the battle state badge.
 *
 * @param {string | null} state The current battle state.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Update the battle state badge with the current state text.
 *
 * @pseudocode
 * 1. Find `#battle-state-badge` and set its text content to the provided state.
 *
 * @param {string|null} state
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Toggle insertion and visibility of the battle state badge based on a flag.
 *
 * @pseudocode
 * 1. If enabling, create the badge element and append to header/right area.
 * 2. If disabling, remove the badge.
 *
 * @param {boolean} enable
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
  updateBattleStateBadge(typeof window !== "undefined" ? window.__classicBattleState : null);
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Apply feature flags to the battle page UI, toggling debug/test features.
 *
 * @pseudocode
 * 1. Set `data-mode` and `data-testMode` on `battleArea`.
 * 2. Toggle inspector, viewport simulation and debug panel per flags.
 * 3. Subscribe to `featureFlagsEmitter` to reapply on changes.
 *
 * @param {HTMLElement|null} battleArea
 * @param {HTMLElement|null} banner
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
export function applyBattleFeatureFlags(battleArea, banner) {
  if (battleArea) {
    battleArea.dataset.mode = "classic";
    battleArea.dataset.testMode = String(isEnabled("enableTestMode"));
  }
  if (banner) banner.classList.toggle("hidden", !isEnabled("enableTestMode"));
  setTestMode(isEnabled("enableTestMode"));
  toggleInspectorPanels(isEnabled("enableCardInspector"));
  toggleViewportSimulation(isEnabled("viewportSimulation"));
  setDebugPanelEnabled(isEnabled("enableTestMode"));

  featureFlagsEmitter.addEventListener("change", () => {
    if (battleArea) battleArea.dataset.testMode = String(isEnabled("enableTestMode"));
    if (banner) banner.classList.toggle("hidden", !isEnabled("enableTestMode"));
    setTestMode(isEnabled("enableTestMode"));
    toggleInspectorPanels(isEnabled("enableCardInspector"));
    toggleViewportSimulation(isEnabled("viewportSimulation"));
    setDebugPanelEnabled(isEnabled("enableTestMode"));
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Initialize the debug panel DOM and restore open state from localStorage.
 *
 * @pseudocode
 * 1. Locate `#debug-panel` and transform to `<details>` if necessary.
 * 2. Insert copy button and restore toggle state from localStorage.
 * 3. Insert panel before the battle area.
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
export function initDebugPanel() {
  const debugPanel = document.getElementById("debug-panel");
  if (!debugPanel) return;
  const battleArea = document.getElementById("battle-area");
  if (isEnabled("enableTestMode") && battleArea) {
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Enable or disable the debug panel dynamically.
 *
 * @pseudocode
 * 1. If enabling, create or convert the panel to `<details>` and insert it.
 * 2. If disabling, hide and remove the panel.
 *
 * @param {boolean} enabled
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
 * 2. Trigger hover events on `#stat-help` for `durationMs` milliseconds.
 * 3. Record that the hint has been shown.
 *
 * @param {number} [durationMs=3000] Hover duration in milliseconds.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Show a temporary stat hint tooltip unless previously shown.
 *
 * @pseudocode
 * 1. Check `localStorage.statHintShown` and exit if present.
 * 2. Dispatch mouseenter on `#stat-help`, then schedule mouseleave after `durationMs`.
 * 3. Persist that the hint was shown.
 *
 * @param {number} [durationMs=3000]
 * @param {Function} [setTimeoutFn=globalThis.setTimeout]
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
export function maybeShowStatHint(durationMs = 3000, setTimeoutFn = globalThis.setTimeout) {
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
 * 1. Call `removeBackdrops(store)`.
 * 2. Call `resetNextButton()`.
 * 3. Call `resetQuitButton()`.
 * 4. Call `clearScoreboardAndMessages()`.
 * 5. Update the debug panel.
 *
 * @param {ReturnType<import("./roundManager.js").createBattleStore>} [store]
 * - Optional battle state store used to tear down the quit modal.
 */
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Reset all battle UI elements to their initial state.
 *
 * @pseudocode
 * 1. Remove modal backdrops and reset Next/Quit buttons.
 * 2. Clear scoreboard/messages and update debug panel.
 *
 * @param {object} [store]
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
export function resetBattleUI(store) {
  removeBackdrops(store);
  resetNextButton();
  resetQuitButton();
  clearScoreboardAndMessages();
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
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Set delay before opponent snackbar appears.
 *
 * @pseudocode
 * 1. If `ms` is finite, update internal `opponentDelayMs`.
 *
 * @param {number} ms
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
export function setOpponentDelay(ms) {
  if (Number.isFinite(ms)) {
    opponentDelayMs = ms;
  }
}

let opponentSnackbarId = 0;

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Bind core UI helper event handlers to battle events (static variant).
 *
 * @pseudocode
 * 1. Register listeners for `opponentReveal`, `statSelected` and `roundResolved`.
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
export function bindUIHelperEventHandlers() {
  onBattleEvent("opponentReveal", () => {
    const container = document.getElementById("opponent-card");
    getOpponentCardData()
      .then((j) => j && renderOpponentCard(j, container))
      .catch(() => {});
  });

  onBattleEvent("statSelected", () => {
    scoreboard.clearTimer();
    opponentSnackbarId = setTimeout(() => showSnackbar(t("ui.opponentChoosing")), opponentDelayMs);
  });

  onBattleEvent("roundResolved", (e) => {
    clearTimeout(opponentSnackbarId);
    const { store, stat, playerVal, opponentVal, result } = e.detail || {};
    if (!result) return;
    showRoundOutcome(result.message || "");
    showStatComparison(store, stat, playerVal, opponentVal);
    updateDebugPanel();
  });
}

// Bind once on module load for runtime. Guard against duplicate bindings when
// tests reset modules across files within the same worker process.
try {
  const FLAG = "__classicBattleUIHelpersBound";
  if (!globalThis[FLAG]) {
    bindUIHelperEventHandlers();
    globalThis[FLAG] = true;
  }
} catch {
  bindUIHelperEventHandlers();
}

// Dynamic variant for tests to honor vi.mocks after rebind
/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Bind UI helper event handlers using dynamic imports to respect mocks in tests.
 *
 * @pseudocode
 * 1. Register async listeners that import required modules on demand.
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
export function bindUIHelperEventHandlersDynamic() {
  // Ensure we only bind once per EventTarget instance
  try {
    const KEY = "__cbUIHelpersDynamicBoundTargets";
    const target = getBattleEventTarget();
    const set = (globalThis[KEY] ||= new WeakSet());
    if (set.has(target)) return;
    set.add(target);
  } catch {}
  onBattleEvent("opponentReveal", async () => {
    const container = document.getElementById("opponent-card");
    try {
      const { getOpponentCardData } = await import("./opponentController.js");
      const { renderOpponentCard } = await import("./uiHelpers.js");
      const j = await getOpponentCardData();
      if (j) await renderOpponentCard(j, container);
    } catch {}
  });

  onBattleEvent("statSelected", async () => {
    try {
      const scoreboard = await import("../setupScoreboard.js");
      scoreboard.clearTimer?.();
    } catch {}
    try {
      const snackbar = await import("../showSnackbar.js");
      const i18n = await import("../i18n.js");
      opponentSnackbarId = setTimeout(
        () => snackbar.showSnackbar(i18n.t("ui.opponentChoosing")),
        opponentDelayMs
      );
    } catch {}
  });

  onBattleEvent("roundResolved", async (e) => {
    clearTimeout(opponentSnackbarId);
    const { store, stat, playerVal, opponentVal, result } = e.detail || {};
    if (!result) return;
    try {
      const { showRoundOutcome, showStatComparison, updateDebugPanel } = await import(
        "./uiHelpers.js"
      );
      showRoundOutcome(result.message || "");
      showStatComparison(store, stat, playerVal, opponentVal);
      updateDebugPanel();
    } catch {}
  });
}
