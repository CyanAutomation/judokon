import { getOpponentCardData } from "./opponentController.js";
import { isEnabled, featureFlagsEmitter } from "../featureFlags.js";
import { STATS } from "../battleEngineFacade.js";
import { isTestModeEnabled, setTestMode } from "../testModeUtils.js";
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
import { onBattleEvent } from "./battleEvents.js";
import * as battleEvents from "./battleEvents.js";
import {
  enableStatButtons,
  disableStatButtons,
  wireStatHotkeys,
  resolveStatButtonsReady
} from "./statButtons.js";
import { guard } from "./guard.js";
import { updateDebugPanel, setDebugPanelEnabled } from "./debugPanel.js";
import { getOpponentDelay } from "./snackbar.js";
import { runWhenIdle } from "./idleCallback.js";

export const INITIAL_SCOREBOARD_TEXT = "You: 0\nOpponent: 0";

/**
 * Ensure the scoreboard has initial text.
 *
 * @pseudocode
 * 1. Select `header #score-display`.
 * 2. If empty, set to `INITIAL_SCOREBOARD_TEXT`.
 */
export let syncScoreDisplay = () => {
  try {
    const el = document.querySelector("header #score-display");
    if (el && !el.textContent) el.textContent = INITIAL_SCOREBOARD_TEXT;
  } catch {}
};
function preloadUiService() {
  import("./uiService.js")
    .then((m) => {
      syncScoreDisplay = m.syncScoreDisplay || syncScoreDisplay;
    })
    .catch(() => {});
}
runWhenIdle(preloadUiService);
/**
 * Skip the inter-round cooldown when the corresponding feature flag is enabled.
 *
 * @pseudocode
 * 1. If the `skipRoundCooldown` feature flag is disabled, return false.
 * 2. Otherwise schedule a microtask (or setTimeout fallback) to emit `countdownFinished`.
 * 3. Return true to indicate the cooldown will be skipped.
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
// showSelectionPrompt moved to ./snackbar.js

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
/**
 * Render the opponent's Judoka card into the given container element.
 *
 * @pseudocode
 * 1. Return early when `judoka` or `container` is missing.
 * 2. Extract rendering options (`lookup`, `enableInspector`) and instantiate `JudokaCard`.
 * 3. Call the card's `render()` method and obtain a DOM node; handle errors gracefully.
 * 4. Preserve any existing `#debug-panel` inside `container` while replacing card content.
 * 5. Append the rendered card node and initialize lazy portrait loading when available.
 *
 * @param {object} judoka - Data required by `JudokaCard` (may include `lookup`).
 * @param {HTMLElement|null} container - DOM element to receive the rendered card.
 * @returns {Promise<void>}
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
 * Disable the Next button and clear its ready marker.
 *
 * @pseudocode
 * btn ← document.querySelector('[data-role="next-round"]')
 * if btn: set disabled = true and delete data-next-ready
 */
// (Removed duplicate disableNextRoundButton; canonical version is below)

/**
 * Enable the Next button and mark it as ready.
 *
 * @pseudocode
 * btn ← document.querySelector('[data-role="next-round"]')
 * if btn: set data-next-ready = "true" and disabled = false
 */
// (Removed duplicate enableNextRoundButton; canonical version is below)

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
/**
 * Enable the Next-round button and mark it ready for interaction.
 *
 * @pseudocode
 * 1. Locate the `#next-button` element in the DOM.
 * 2. If found, set `disabled = false` and `data-next-ready = "true"` to indicate readiness.
 *
 * @returns {void}
 */
export function enableNextRoundButton() {
  const btn =
    document.getElementById("next-button") || document.querySelector('[data-role="next-round"]');
  if (!btn) return;
  // Be permissive here for helpers: explicitly enable and mark ready
  btn.dataset.nextReady = "true";
  btn.disabled = false;
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
/**
 * Disable the Next-round button and clear its ready state.
 *
 * @pseudocode
 * 1. Locate `#next-button` in the DOM.
 * 2. If present, set `disabled = true` and remove the `data-next-ready` flag.
 *
 * @returns {void}
 */
export function disableNextRoundButton() {
  const btn =
    document.getElementById("next-button") || document.querySelector('[data-role="next-round"]');
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
/**
 * Display a round outcome across scoreboard and result regions.
 *
 * @param {string} message - Outcome text to display (e.g. "You Win").
 * @returns {void}
 * @pseudocode
 * 1. Render the message using `showResult(message)`.
 * 2. Forward the message to `scoreboard.showMessage` marking it as an outcome.
 * 3. Keep outcome messaging out of transient snackbars to avoid UI conflicts.
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
/**
 * Animate or update the stat comparison area after a round resolves.
 *
 * @param {object} store - Battle state store (used to save RAF ids and flags).
 * @param {string} stat - Stat key that was compared.
 * @param {number} playerVal - Player's stat value.
 * @param {number} compVal - Opponent's stat value.
 * @returns {void}
 * @pseudocode
 * 1. Locate the `#round-result` element and cancel any previous animation.
 * 2. If reduced motion is requested, write the final text immediately.
 * 3. Otherwise animate numbers from current to target over ~500ms using RAF.
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
/**
 * Observe device orientation/resize and run `callback` to apply orientation.
 *
 * The provided `callback` should return a Promise<boolean> or a boolean to
 * indicate whether orientation was successfully applied. The function exposes
 * `window.applyBattleOrientation` for manual invocations and throttles
 * resize/orientation events to avoid excessive layout work.
 *
 * @param {() => Promise<boolean>} callback - Called to apply orientation; should resolve `true` on success.
 * @returns {void}
 * @pseudocode
 * 1. Expose `window.applyBattleOrientation` which invokes `callback`.
 * 2. Invoke `callback()` immediately; if it fails, start RAF polling until it succeeds.
 * 3. Attach `orientationchange` and `resize` listeners that throttle via RAF and re-run `callback`.
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
 * @summary Attach the Next button click handler and warn when absent.
 *
 * Ensures the primary Next control receives the `onNextButtonClick` handler.
 * Falls back to `[data-role="next-round"]` when `#next-button` is missing
 * (useful for tests or alternate UIs).
 *
 * @pseudocode
 * 1. Query `#next-button`, falling back to `[data-role="next-round"]`.
 * 2. If not found, optionally warn in test mode and return.
 * 3. Attach `onNextButtonClick` to the element's `click` event.
 *
 * @returns {void}
 */
export function setupNextButton() {
  let btn = document.getElementById("next-button");
  if (!btn) {
    if (isTestModeEnabled())
      console.warn('[test] #next-button missing, falling back to [data-role="next-round"]');
    btn = document.querySelector('[data-role="next-round"]');
    if (!btn) {
      if (isTestModeEnabled()) console.warn("[test] next round button missing");
      return;
    }
  }
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
/**
 * Programmatically select a stat and trigger the standard selection flow.
 *
 * Normalizes the selection to the same pathway used by UI clicks so tests and
 * automation see identical side effects: visual state, selection handling,
 * and a snackbar hint. This is intentionally defensive and does not throw on
 * missing DOM nodes.
 *
 * @pseudocode
 * 1. Find the button for `stat` in `#stat-buttons`.
 * 2. If the button is missing, return early.
 * 3. Disable all stat buttons and apply a `selected` class to the chosen button.
 * 4. Read player/opponent stat values from their cards.
 * 5. Call `handleStatSelection(store, stat, { playerVal, opponentVal })`.
 * 6. Show a snackbar with the chosen stat label.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - Battle state store.
 * @param {string} stat - Stat key to select (e.g. 'strength').
 * @returns {void}
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
 * Attach the Next button click handler to the DOM Next control.
 *
 * @pseudocode
 * 1. Query the DOM for `#next-button` and fallback to `[data-role="next-round"]`.
 * 2. If not found, emit optional test-mode warnings and return.
 * 3. Attach `onNextButtonClick` to the `click` event of the discovered button.
 *
 * @returns {void}
 */

/**
 * Programmatically select a stat button and trigger the selection flow.
 *
 * @pseudocode
 * 1. Locate the stat button element for `stat` and derive a human label.
 * 2. Disable all stat buttons and mark the chosen button as `selected` for visual feedback.
 * 3. Read player/opponent values from card elements and call `handleStatSelection`.
 * 4. Show a snackbar message indicating the chosen stat.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - Battle state store.
 * @param {string} stat - Stat key to select (e.g. 'strength').
 * @returns {void}
 */

/**
 * Remove modal backdrops and destroy the current quit modal.
 *
 * @pseudocode
 * 1. Remove all `.modal-backdrop` elements.
 * 2. Destroy and nullify `store.quitModal` when present.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} [store]
 * @returns {void}
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
/**
 * Remove modal backdrops and destroy any active quit modal.
 *
 * @pseudocode
 * 1. Remove all elements matching `.modal-backdrop` from the document.
 * 2. If `store.quitModal` exists, call `destroy()` on it and set it to null.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} [store]
 * @returns {void}
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
 * Remove modal backdrops and destroy any active quit modal stored on `store`.
 *
 * @pseudocode
 * 1. Remove all elements matching `.modal-backdrop` from the DOM.
 * 2. If `store.quitModal` exists, call its `destroy()` method and nullify the reference.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} [store]
 * @returns {void}
 */

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
 * Replace the Next button with a disabled clone to drop attached listeners.
 *
 * @pseudocode
 * 1. Query `#next-button` and return early if missing.
 * 2. Clone the node, disable the clone and remove `data-next-ready`.
 * 3. Attach `onNextButtonClick` to the clone and replace the original in the DOM.
 *
 * @returns {void}
 */

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
 * Replace the Quit button with an inert clone to remove existing event listeners.
 *
 * @pseudocode
 * 1. Locate `#quit-match-button` in the DOM.
 * 2. Replace it with `cloneNode(true)` so existing listeners are dropped.
 *
 * @returns {void}
 */

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
 * Clear scoreboard messages/timers and synchronize the scoreboard display.
 *
 * @pseudocode
 * 1. Call `scoreboard.clearMessage()` and `scoreboard.clearTimer()` to remove transient state.
 * 2. Clear `#round-result` text if present.
 * 3. Call `syncScoreDisplay()` to ensure the scoreboard shows initial text when empty.
 *
 * @returns {void}
 */

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
 * @summary Initialize stat selection buttons; assert DOM nodes.
 *
 * Throws when the container is missing and warns when no buttons are found.
 *
 * @pseudocode
 * 1. Locate `#stat-buttons`; throw if absent.
 * 2. Gather buttons; warn and return noop controls when empty.
 * 3. Disable buttons initially.
 * 4. Wire click and keyboard handlers for stat selection.
 * 5. Return an API `{ enable, disable }`.
 *
 * @param {object} store Battle store for selection handling.
 * @returns {{ enable: () => void, disable: () => void }} Control API.
 */
export function initStatButtons(store) {
  const statContainer = document.getElementById("stat-buttons");
  if (!statContainer) {
    throw new Error("initStatButtons: #stat-buttons missing");
  }

  const statButtons = statContainer.querySelectorAll("button");
  if (!statButtons.length) {
    window.statButtonsReadyPromise = Promise.resolve();
    resolveStatButtonsReady();
    guard(() => console.warn("[uiHelpers] #stat-buttons has no buttons"));
    return { enable: () => {}, disable: () => {} };
  }

  let resolveReady;
  const resetReady = () => {
    window.statButtonsReadyPromise = new Promise((r) => {
      resolveReady = r;
      window.__resolveStatButtonsReady = r;
    });
  };

  let detachHotkeys = null;

  const enable = () => {
    enableStatButtons(statButtons, statContainer);
    resolveReady?.();
    if (!detachHotkeys) detachHotkeys = wireStatHotkeys(statButtons);
  };
  const disable = () => {
    disableStatButtons(statButtons, statContainer);
    resetReady();
    detachHotkeys?.();
    detachHotkeys = null;
  };

  resetReady();
  disable();

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
      guard(disable);
    };
    btn.addEventListener("click", clickHandler);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        clickHandler();
      }
    });
  });

  detachHotkeys = wireStatHotkeys(statButtons);

  return { enable, disable };
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
 * Update the battle state badge text content to reflect the current state.
 *
 * @pseudocode
 * 1. Query `#battle-state-badge` and exit if missing.
 * 2. Set its text content to `State: <state>` or `State: —` when `state` is null.
 *
 * @param {string|null} state - Current battle state or null when unknown.
 * @returns {void}
 */

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
 * Enable or remove the battle state badge element according to `enable`.
 *
 * @pseudocode
 * 1. If `enable` is false and a badge exists, remove it and return.
 * 2. If enabling and no badge exists, create the badge element and append it to header/right area.
 * 3. Populate the badge text using the current state snapshot.
 *
 * @param {boolean} enable - True to show the badge, false to remove it.
 * @returns {void}
 */

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
  updateBattleStateBadge(getStateSnapshot().state);
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
 * Apply active feature flags to the battle UI and subscribe for changes.
 *
 * @pseudocode
 * 1. Set `data-mode` and `data-testMode` on the `battleArea` element.
 * 2. Toggle visibility of the `banner` according to `enableTestMode`.
 * 3. Toggle inspector panels, viewport simulation and the debug panel per flags.
 * 4. Subscribe to `featureFlagsEmitter` `change` events to reapply flags dynamically.
 *
 * @param {HTMLElement|null} battleArea - The main battle container element.
 * @param {HTMLElement|null} banner - Optional banner element to show/hide for test mode.
 * @returns {void}
 */

/**
 * Initialize the optional debug panel.
 *

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
 * Show a temporary stat hint tooltip unless previously shown.
 *
 * @pseudocode
 * 1. Check `localStorage.statHintShown` and return if present.
 * 2. Trigger `mouseenter` on `#stat-help` and schedule `mouseleave` after `durationMs`.
 * 3. Record that the hint has been shown in `localStorage`.
 *
 * @param {number} [durationMs=3000] - Milliseconds to keep the hint visible.
 * @param {Function} [setTimeoutFn=globalThis.setTimeout] - Optional timeout function (testable).
 * @returns {void}
 */

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

/**
 * Reset all battle UI elements to their initial state.
 *
 * @pseudocode
 * 1. Remove modal backdrops and destroy quit modal (if `store` provided).
 * 2. Reset Next and Quit buttons to drop listeners.
 * 3. Clear scoreboard messages and timers.
 * 4. Update debug panel to reflect the reset state.
 *
 * @param {ReturnType<import("./roundManager.js").createBattleStore>} [store] - Optional store used to destroy active modals.
 * @returns {void}
 */

// --- Event bindings ---

if (typeof window !== "undefined") {
  window.addEventListener("game:reset-ui", (e) => {
    resetBattleUI(e.detail?.store);
  });
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

  onBattleEvent("statSelected", (e) => {
    scoreboard.clearTimer();
    const opts = (e && e.detail && e.detail.opts) || {};
    if (!opts.delayOpponentMessage) {
      opponentSnackbarId = setTimeout(
        () => showSnackbar(t("ui.opponentChoosing")),
        getOpponentDelay()
      );
    }
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
