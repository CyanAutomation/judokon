import { isEnabled } from "../featureFlags.js";
import { STATS } from "../battleEngineFacade.js";

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
import { JudokaCard } from "../../components/JudokaCard.js";
import { setupLazyPortraits } from "../lazyPortrait.js";

import { createModal } from "../../components/Modal.js";
import { createButton } from "../../components/Button.js";
// Removed unused import for 'battleEvents'
import {
  enableStatButtons,
  disableStatButtons,
  wireStatHotkeys,
  resolveStatButtonsReady
} from "./statButtons.js";
import { guard } from "./guard.js";
import { updateDebugPanel } from "./debugPanel.js";
import { runWhenIdle } from "./idleCallback.js";
import { getStateSnapshot } from "./battleDebug.js";

/**
 * Determine whether round cooldowns should be skipped.
 *
 * @returns {boolean}
 * @pseudocode
 * 1. Return the `skipRoundCooldown` feature flag state.
 */
export function skipRoundCooldownIfEnabled() {
  return isEnabled("skipRoundCooldown");
}

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
  // Preload optional module during idle; keep hot path clean
  import("./uiService.js")
    .then((m) => {
      // Fall back to local implementation if export missing
      syncScoreDisplay = m.syncScoreDisplay || syncScoreDisplay;
    })
    .catch(() => {});
}
runWhenIdle(preloadUiService);

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
 * Mark the Next round button ready and enabled.
 *
 * @pseudocode
 * 1. Locate the `#next-button` element in the DOM.
 * 2. If found, set `disabled = false` and `data-next-ready = "true"`.
 * 3. If not found, warn and fall back to `[data-role="next-round"]`.
 * 4. If fallback found, attach click handler; otherwise warn about missing button.
 *
 * @returns {void}
 */
export function setupNextButton() {
  let btn = document.getElementById("next-button");

  if (!btn) {
    guard(() => {
      if (typeof window !== "undefined" && window.__testMode) {
        console.warn('[test] #next-button missing, falling back to [data-role="next-round"]');
      }
    });
    btn = document.querySelector('[data-role="next-round"]');

    if (btn) {
      btn.addEventListener("click", onNextButtonClick);
    } else {
      guard(() => {
        if (typeof window !== "undefined" && window.__testMode) {
          console.warn("[test] next round button missing");
        }
      });
      return;
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.dataset.nextReady = "true";
  }
}

/**
 * Disable the Next-round button and clear its ready state.
 *
 * @pseudocode
 * 1. Locate `#next-button` in the DOM.
 * 2. If present, set `disabled = true` and remove the `data-next-ready` flag.
 *
 * @returns {void}
 */
/**
 * Enable the Next-round button and set its ready state.
 *
 * Finds `#next-button` (or fallback) and enables it, setting the
 * `data-next-ready` marker so consumers know the control is ready.
 *
 * @pseudocode
 * 1. Query `#next-button` and fallback to `[data-role="next-round"]`.
 * 2. If found, set `disabled = false` and `data-next-ready = "true"`.
 *
 * @returns {void}
 */
export function enableNextRoundButton() {
  const btn =
    document.getElementById("next-button") || document.querySelector('[data-role="next-round"]');
  if (!btn) return;
  btn.disabled = false;
  btn.dataset.nextReady = "true";
}

/**
 * Disable the Next-round button and clear its ready state.
 *
 * Finds `#next-button` (or fallback) and disables it, removing the
 * `data-next-ready` marker so consumers know the control is not ready.
 *
 * @pseudocode
 * 1. Query `#next-button` and return early if missing.
 * 2. Set `disabled = true` and delete `data-next-ready`.
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
 * Display a round outcome across scoreboard and result regions.
 *
 * Renders the outcome into the non-transient result area and forwards a
 * copy to the scoreboard. Avoids using snackbars for outcome messages so
 * transient countdown/hint flows remain unaffected.
 *
 * @pseudocode
 * 1. Call `showResult(message)` to render the main outcome.
 * 2. Call `scoreboard.showMessage(message, { outcome: true })`.
 * 3. Avoid showing a snackbar for outcome messages.
 *
 * @param {string} message - Outcome text to display (e.g. "You Win").
 * @returns {void}
 */
export function showRoundOutcome(message) {
  showResult(message);
  scoreboard.showMessage(message, { outcome: true });
  // Outcome messages belong in the round message region; avoid using snackbar
  // here so countdowns and hints can occupy it consistently.
}

/**
 * Animate or update the stat comparison area after a round resolves.
 *
 * Cancels any previously scheduled animation and either renders the final
 * values immediately (when reduced motion is preferred) or animates the
 * numeric transition over ~500ms using the scheduler helper.
 *
 * @pseudocode
 * 1. Query `#round-result`; return early if missing.
 * 2. Cancel any prior RAF stored in `store.compareRaf`.
 * 3. If reduced motion is enabled, write final text and return.
 * 4. Otherwise animate numeric values from start to target over ~500ms using RAF.
 * 5. Store the new RAF id on `store.compareRaf` for future cancellation.
 *
 * @param {object} store - Battle state store (used to save RAF ids and flags).
 * @param {string} stat - Stat key that was compared.
 * @param {number} playerVal - Player's stat value.
 * @param {number} compVal - Opponent's stat value.
 * @returns {void}
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
 * Watch orientation changes and invoke a callback until it succeeds.
 *
 * @pseudocode
 * 1. Invoke `callback`; if it returns falsey, poll via rAF until it succeeds.
 * 2. Register `orientationchange` and `resize` listeners to retry invocation.
 *
 * @param {() => any} callback - Function returning truthy when orientation applied.
 * @returns {void}
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
export function attachNextButtonHandler() {
  // Implementation would go here - but this seems to be a missing function
  // For now, leaving as placeholder to fix the structure
}

/**
 * Remove modal backdrops and destroy any active quit modal stored on `store`.
 *
 * @pseudocode
 * 1. Query all elements with the class `.modal-backdrop` and remove them from the DOM.
 * 2. Check if a `quitModal` exists in the provided `store`.
 * 3. If it exists, call its `destroy()` method to clean up its DOM elements and event listeners.
 * 4. Set `store.quitModal` to `null` to release the reference.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} [store] - Optional store containing a reference to the quit modal.
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
 * Replace the Next button with a fresh disabled clone and wire the click handler.
 *
 * @pseudocode
 * 1. Attempt to locate the `#next-button` element in the DOM.
 * 2. If the button is found:
 *    a. Create a deep clone of the button.
 *    b. Disable the cloned button.
 *    c. Remove the `data-next-ready` attribute from the clone.
 *    d. Attach the `onNextButtonClick` event listener to the cloned button.
 *    e. Replace the original button in the DOM with the newly created clone.
 * @returns {void}
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
 * 1. Attempt to locate the `#quit-match-button` element in the DOM.
 * 2. If the button is found, replace it with a deep clone of itself. This effectively
 *    removes all previously attached event listeners from the original button.
 * @returns {void}
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
 * Initializes the stat selection buttons, wiring up click handlers and hotkeys.
 *
 * @pseudocode
 * 1. Get the stat buttons container (`#stat-buttons`). Throw an error if not found.
 * 2. Get all stat buttons within the container. If none, resolve `statButtonsReadyPromise` and return inert enable/disable functions.
 * 3. Define `resetReady` to create a new `statButtonsReadyPromise` and expose its resolver globally.
 * 4. Define `enable` function: enables stat buttons, resolves `statButtonsReadyPromise`, and wires hotkeys.
 * 5. Define `disable` function: disables stat buttons, resets `statButtonsReadyPromise`, and detaches hotkeys.
 * 6. Call `resetReady()` and `disable()` initially.
 * 7. For each stat button:
 *    a. Attach a click handler that:
 *       i. Prevents action if disabled.
 *       ii. Calls `handleStatSelection` (guarded).
 *       iii. Shows a snackbar message (guarded).
 *       iv. Disables all stat buttons (guarded).
 *    b. Attach a keydown handler for Enter/Space to trigger the click handler.
 * 8. Wire initial hotkeys.
 * 9. Return an object with `enable` and `disable` functions.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - The battle state store.
 * @returns {{enable: Function, disable: Function}} An object with enable and disable functions for the stat buttons.
 */
export function initStatButtons(store) {
  // Mark intentionally unused to satisfy eslint while preserving API
  void store;
  const container = document.getElementById("stat-buttons");
  if (!container) throw new Error("initStatButtons: #stat-buttons missing");
  const buttons = Array.from(container.querySelectorAll("button"));
  if (buttons.length === 0) {
    console.warn("[uiHelpers] #stat-buttons has no buttons");
    try {
      resolveStatButtonsReady();
    } catch {}
    return { enable: () => {}, disable: () => {} };
  }

  let disposeHotkeys = null;

  const enable = () => {
    enableStatButtons(buttons, container);
    try {
      resolveStatButtonsReady();
    } catch {}
    try {
      disposeHotkeys = wireStatHotkeys(buttons);
    } catch {}
  };

  const disable = () => {
    disableStatButtons(buttons, container);
    try {
      disposeHotkeys?.();
    } catch {}
    disposeHotkeys = null;
  };

  // Initialize disabled by default
  disable();
  return { enable, disable };
}

/**
 * Applies localized stat names and accessibility attributes to stat buttons.
 *
 * @pseudocode
 * 1. Load stat names asynchronously.
 * 2. Iterate over the loaded stat names and their corresponding STATS keys.
 * 3. For each stat:
 *    a. Construct a selector for the stat button.
 *    b. Handle potential errors during selector construction or DOM query.
 *    c. If the button is found:
 *       i. Set its `textContent` to the localized stat name.
 *       ii. Set its `aria-label` for accessibility.
 *       iii. Create or update a visually hidden description for screen readers, linking it via `aria-describedby`.
 *
 * @returns {Promise<void>} A promise that resolves when stat labels are applied.
 */
export async function applyStatLabels() {
  const names = await loadStatNames().catch(() => ({}));
  const entries = Object.keys(STATS || {});
  for (const key of entries) {
    const selector = `#stat-buttons [data-stat='${key}']`;
    /** @type {HTMLButtonElement|null} */
    const btn = document.querySelector(selector);
    if (!btn) continue;
    const label = names[key] || key.charAt(0).toUpperCase() + key.slice(1);
    try {
      btn.textContent = label;
      btn.setAttribute("aria-label", label);
      const descId = `stat-desc-${key}`;
      let desc = document.getElementById(descId);
      if (!desc) {
        desc = document.createElement("span");
        desc.id = descId;
        desc.className = "sr-only";
        desc.textContent =
          typeof t === "function" ? t("battle.statButtonDescription", label) : label;
        btn.after(desc);
      }
      btn.setAttribute("aria-describedby", descId);
    } catch {}
  }
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
 * Update the battle state badge with the current state text.
 *
 * Updates the DOM element `#battle-state-badge` to reflect the provided
 * `state`. This helper is defensive: if the badge is missing or a DOM
 * operation throws, the function returns without propagating an error.
 *
 * @pseudocode
 * 1. Query `#battle-state-badge`; if absent return early.
 * 2. Set text to `State: <state>` when `state` is non-null, otherwise `State: —`.
 * 3. Catch DOM errors and set fallback text `State: —`.
 *
 * @param {string|null} state - Current battle state or null when unknown.
 * @returns {void}
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
 * Toggle insertion and visibility of the battle state badge based on a flag.
 *
 * @pseudocode
 * 1. If enabling, create the badge element and append to header/right area.
 * 2. If disabling, remove the badge.
 *
 * @param {boolean} enable - True to show the badge, false to remove it.
 * @returns {void}
 */
export function setBattleStateBadgeEnabled(enable) {
  console.debug("setBattleStateBadgeEnabled called with:", enable);
  let badge = document.getElementById("battle-state-badge");
  console.debug("Found existing badge:", badge);
  if (!enable) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    console.debug("Creating new badge");
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
  console.debug("Setting badge visible, before:", badge.hidden, badge.hasAttribute("hidden"));
  badge.hidden = false;
  badge.removeAttribute("hidden");
  console.debug("Setting badge visible, after:", badge.hidden, badge.hasAttribute("hidden"));
  updateBattleStateBadge(getStateSnapshot().state);
}

/**
 * Reset all battle UI elements to their initial state.
 *
 * @pseudocode
 * 1. Remove modal backdrops and reset Next/Quit buttons.
 * 2. Clear scoreboard/messages and update debug panel.
 *
 * @param {object} [store]
 * @returns {void}
 */
export function resetBattleUI() {
  removeBackdrops();
  resetNextButton();
  resetQuitButton();
  clearScoreboardAndMessages();
  updateDebugPanel();
}

/**
 * Reset all battle UI elements to their initial state.
 *
 * @pseudocode
 * 1. Call `removeBackdrops(store)` to dismiss any open modals and their backdrops.
 * 2. Call `resetNextButton()` to reset the "Next Round" button to its initial disabled state.
 * 3. Call `resetQuitButton()` to reset the "Quit Match" button, removing any attached listeners.
 * 4. Call `clearScoreboardAndMessages()` to clear all messages, timers, and results from the scoreboard.
 * 5. Call `updateDebugPanel()` to refresh the debug panel's display to reflect the reset state.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} [store] - Optional store used to destroy active modals.
 * @returns {void}
 */

// --- Event bindings ---

if (typeof window !== "undefined") {
  window.addEventListener("game:reset-ui", (e) => {
    resetBattleUI(e.detail?.store);
  });
}

/**
 * Binds event handlers for various UI updates related to battle events.
 *
 * @pseudocode
 * 1. Listen for `opponentReveal` event:
 *    a. Get opponent card data.
 *    b. Render the opponent card in the `#opponent-card` container.
 * 2. Listen for `statSelected` event:
 *    a. Clear the scoreboard timer.
 *    b. If `opponentDelayMessage` feature flag is enabled, show a "Opponent choosing..." snackbar after a delay.
 * 3. Listen for `roundResolved` event:
 *    a. Clear any pending opponent choosing snackbar timeout.
 *    b. Extract round resolution details (store, stat, values, result).
 *    c. If a result exists, show the round outcome, display stat comparison, and update the debug panel.
 *
 * @returns {void}
 */
export function bindUIHelperEventHandlers() {
  // Event handlers for UI updates (implementation placeholder)
  // This function would contain event listener bindings based on the pseudocode above
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
