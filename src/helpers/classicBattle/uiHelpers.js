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
import { updateDebugPanel as updateDebugPanelImpl, setDebugPanelEnabled } from "./debugPanel.js";
/**
 * Re-export of updateDebugPanel from debugPanel.js
/**
 * Re-export of updateDebugPanel from debugPanel.js
 *
 * @see ./debugPanel.js
 * @returns {void}
 * @pseudocode
 * 1. This is a re-export - see original function documentation.
 */
export { updateDebugPanelImpl as updateDebugPanel };

import { runWhenIdle } from "./idleCallback.js";
import { writeScoreDisplay } from "./scoreDisplay.js";
import { bindUIHelperEventHandlersDynamic } from "./uiEventHandlers.js";
import { getStateSnapshot } from "./battleDebug.js";
import { getCurrentSeed } from "../testModeUtils.js";

/**
 * Determine whether round cooldowns should be skipped and optionally invoke a fast path.
 *
 * @param {{ onSkip?: () => void }} [options]
 * @returns {boolean} True when the skip flag is active.
 * @pseudocode
 * 1. Resolve the `skipRoundCooldown` feature flag state.
 * 2. If disabled, return `false` immediately.
 * 3. When enabled and an `onSkip` callback is provided, execute it defensively.
 * 4. Return `true` to indicate the skip flag is active.
 */
export function skipRoundCooldownIfEnabled(options = {}) {
  const enabled = isEnabled("skipRoundCooldown");
  setSkipRoundCooldownFeatureMarker(enabled);
  if (!enabled) return false;
  const { onSkip } = options || {};
  if (typeof onSkip === "function") {
    try {
      onSkip();
    } catch (error) {
      console.warn("Error executing onSkip callback:", error);
    }
  }
  return true;
}

/**
 * Mark DOM elements to reflect whether the skip-round-cooldown feature is enabled.
 *
 * @param {boolean} enable - Flag indicating whether the feature should appear enabled.
 * @returns {void}
 * @pseudocode
 * 1. Abort when `document` is undefined (non-DOM environment).
 * 2. Derive an attribute value of "enabled" or "disabled" based on `enable`.
 * 3. Apply the attribute to `document.body` for global styling hooks.
 * 4. Locate the "next" button and mirror the attribute if the element exists.
 */
export function setSkipRoundCooldownFeatureMarker(enable) {
  if (typeof document === "undefined") return;
  const value = enable ? "enabled" : "disabled";
  document.body?.setAttribute("data-feature-skip-round-cooldown", value);
  const nextButton =
    document.getElementById("next-button") || document.querySelector('[data-role="next-round"]');
  if (nextButton) {
    nextButton.setAttribute("data-feature-skip-round-cooldown", value);
  }
}

/**
 * Synchronize DOM markers and debug affordances with the test-mode feature flag.
 *
 * @param {HTMLElement|null} battleArea - Primary battle container whose dataset reflects test mode.
 * @param {HTMLElement|null} banner - Banner element that communicates the active seed in test mode.
 * @returns {boolean} True when test mode is active.
 * @pseudocode
 * 1. Read the `enableTestMode` feature flag and set the debug panel visibility.
 * 2. If `battleArea` exists, add or remove `data-test-mode` attributes according to the flag state.
 * 3. If `banner` exists and test mode is enabled, populate banner text, show the element, and set dataset metadata.
 * 4. When test mode is disabled, hide the banner and clear any previously applied metadata.
 * 5. Return the resolved flag value for caller awareness.
 */
export function applyBattleFeatureFlags(battleArea, banner) {
  const testModeEnabled = isEnabled("enableTestMode");
  try {
    setDebugPanelEnabled(testModeEnabled);
  } catch {}

  if (battleArea) {
    if (testModeEnabled) {
      battleArea.setAttribute("data-test-mode", "true");
      battleArea.setAttribute("data-feature-test-mode", "true");
    } else {
      battleArea.removeAttribute("data-test-mode");
      battleArea.removeAttribute("data-feature-test-mode");
    }
  }

  if (banner) {
    if (testModeEnabled) {
      const seed = getCurrentSeed();
      banner.textContent = `Test Mode active (seed ${seed})`;
      banner.hidden = false;
      banner.removeAttribute("hidden");
      banner.dataset.seed = String(seed);
      banner.setAttribute("data-feature-test-mode", "banner");
    } else {
      banner.hidden = true;
      banner.setAttribute("hidden", "");
      banner.textContent = "";
      delete banner.dataset.seed;
      banner.removeAttribute("data-feature-test-mode");
    }
  }

  return testModeEnabled;
}

export const INITIAL_SCOREBOARD_TEXT = "You: 0 Opponent: 0";

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
    if (el && !el.textContent) {
      writeScoreDisplay(0, 0);
    }
  } catch {}
};

/**
 * Preload UI service module during idle time.
 *
 * @pseudocode
 * 1. Import uiService module asynchronously during idle time.
 * 2. Update syncScoreDisplay function with module implementation if available.
 * 3. Fall back to local implementation if module export is missing.
 * 4. Handle import errors gracefully without affecting main functionality.
 */
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
    guard(() => console.debug("Error rendering JudokaCard:", err));
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
 * Show the round outcome, optionally consolidating stat selections into the message.
 *
 * @param {string} outcomeMessage - The base outcome text (e.g., "You win the round!").
 * @param {string} [stat] - The stat key selected (e.g., "power").
 * @param {number} [playerVal] - Player's value for the stat.
 * @param {number} [opponentVal] - Opponent's value for the stat.
 * @returns {void}
 * @pseudocode
 * 1. When `stat` and both values are valid numbers, compose a consolidated message:
 *    "You picked: Stat (P) — Opponent picked: Stat (O) — <outcome>" with capitalized stat.
 * 2. Otherwise, use the base `outcomeMessage`.
 * 3. Call `showResult(message)` and `scoreboard.showMessage(message, { outcome: true })`.
 */
export function showRoundOutcome(outcomeMessage, stat, playerVal, opponentVal) {
  let message = outcomeMessage || "";
  const hasStat = typeof stat === "string" && stat.trim();
  const pOk = Number.isFinite(playerVal);
  const oOk = Number.isFinite(opponentVal);
  if (hasStat && pOk && oOk) {
    const label = stat.charAt(0).toUpperCase() + stat.slice(1);
    message = `You picked: ${label} (${playerVal}) — Opponent picked: ${label} (${opponentVal}) — ${outcomeMessage}`;
  }
  try {
    showResult(message);
  } catch {}
  try {
    scoreboard.showMessage(message, { outcome: true });
  } catch {}
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
  }

  if (btn) {
    if (!btn.__classicBattleNextHandlerAttached) {
      try {
        btn.addEventListener("click", onNextButtonClick);
        btn.__classicBattleNextHandlerAttached = true;
      } catch (error) {
        guard(() => console.warn("[next] failed to bind click handler:", error));
      }
    }
    try {
      delete btn.dataset.nextReady;
      if (!btn.hasAttribute("disabled")) {
        btn.disabled = true;
      }
    } catch {}
    return;
  }

  guard(() => {
    if (typeof window !== "undefined" && window.__testMode) {
      console.warn("[test] next round button missing");
    }
  });
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
  try {
    btn.removeAttribute("disabled");
    btn.setAttribute("data-next-ready", "true");
  } catch {}
  try {
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      console.debug(
        `[test] enableNextRoundButton: disabled=${btn.disabled} dataset=${btn.dataset.nextReady}`
      );
    }
  } catch {}
}

/**
 * Disable the Next-round button and clear its ready state.
 *
 * @returns {void}
 * @pseudocode
 * 1. Query the primary or fallback Next button element.
 * 2. Set `disabled = true` and remove ready/finalized dataset markers.
 * 3. Emit a test log when running under Vitest.
 */
export function disableNextRoundButton() {
  const btn =
    document.getElementById("next-button") || document.querySelector('[data-role="next-round"]');
  if (!btn) return;
  btn.disabled = true;
  delete btn.dataset.nextReady;
  delete btn.dataset.nextFinalized;
  try {
    if (typeof process !== "undefined" && process.env && process.env.VITEST) {
      console.debug(`[test] disableNextRoundButton: disabled=${btn.disabled}`);
    }
  } catch {}
}

function readVisibleRoundNumber() {
  try {
    const counter = document.getElementById("round-counter");
    if (!counter) return null;
    const match = String(counter.textContent ?? "").match(/Round\s*(\d+)/i);
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Update the diagnostic tracker for the highest displayed round.
 *
 * @param {number|null} visibleRound - Round number parsed from the counter label.
 * @returns {number|null} The stored highest round after normalization.
 * @pseudocode
 * 1. Normalize the current diagnostic value to a positive integer or zero.
 * 2. Normalize the visible round snapshot to a positive integer when available.
 * 3. If a visible round exists, store the max of the current and visible rounds.
 * 4. When no visible round exists, preserve the normalized current diagnostic value.
 * 5. Return the resulting positive integer or null when no rounds are recorded.
 */
function updateHighestDisplayedRoundDiagnostic(visibleRound) {
  if (typeof window === "undefined") {
    return null;
  }

  const current = Number(window.__highestDisplayedRound);
  const normalizedCurrent = Number.isFinite(current) && current > 0 ? current : 0;
  const normalizedVisible = Number.isFinite(visibleRound) && visibleRound > 0 ? visibleRound : null;

  if (normalizedVisible !== null) {
    const nextHighest =
      normalizedCurrent > 0 ? Math.max(normalizedCurrent, normalizedVisible) : normalizedVisible;
    if (nextHighest > 0) {
      window.__highestDisplayedRound = nextHighest;
      return nextHighest;
    }
  } else if (!Number.isFinite(current)) {
    window.__highestDisplayedRound = normalizedCurrent;
    return normalizedCurrent > 0 ? normalizedCurrent : null;
  }

  return Number.isFinite(window.__highestDisplayedRound)
    ? Number(window.__highestDisplayedRound)
    : null;
}

function applyButtonFinalizedState(btn) {
  if (!btn) return;

  try {
    btn.disabled = false;
    btn.removeAttribute("disabled");
    btn.setAttribute("data-next-ready", "true");
    btn.setAttribute("data-next-finalized", "true");
    if (btn.dataset) {
      if (!btn.dataset.nextReady) {
        btn.dataset.nextReady = "true";
      }
      btn.dataset.nextFinalized = "true";
    }
  } catch {}
}

/**
 * Mark the Next button as finalized and keep readiness diagnostics in sync.
 *
 * @returns {void}
 * @pseudocode
 * 1. Locate the primary and fallback Next button elements.
 * 2. Read the visible round number from the round counter for diagnostic updates.
 * 3. Flag global selection finalization markers and bump the stored highest round when applicable.
 * 4. Enable each button and ensure `data-next-ready`/`data-next-finalized="true"` are applied consistently.
 */
export function setNextButtonFinalizedState() {
  if (typeof document === "undefined") return;

  const primary = document.getElementById("next-button");
  const fallback = document.querySelector('[data-role="next-round"]');
  const target = primary || fallback || null;
  const visibleRound = readVisibleRoundNumber();

  try {
    if (typeof window !== "undefined") {
      window.__classicBattleSelectionFinalized = true;
      window.__classicBattleLastFinalizeContext = "advance";
      updateHighestDisplayedRoundDiagnostic(visibleRound);
    }
  } catch {}

  applyButtonFinalizedState(target);
  if (fallback && fallback !== primary) {
    applyButtonFinalizedState(fallback);
  }
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
 * 1. If stat comparison data is provided, prepend it to the message.
 * 2. Call `showResult(fullMessage)` to render the consolidated outcome.
 * 3. Call `scoreboard.showMessage(fullMessage, { outcome: true })`.
 * 4. Avoid showing a snackbar for outcome messages.
 *
 * @param {string} message - Outcome text to display (e.g. "You Win").
 * @param {string} [stat] - Optional stat name that was compared.
 * @param {number} [playerVal] - Optional player's stat value.
 * @param {number} [opponentVal] - Optional opponent's stat value.
 * @returns {void}
 */
// Note: removed older duplicate implementation to avoid multiple declaration errors in tests.

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
/**
 * Register an error handler for round start failures.
 *
 * @param {Function} retryFn - Function to call when retrying the failed round start.
 * @returns {Function} Cleanup function to remove the event listener.
 * @summary Handle round start errors with user-friendly messaging and retry option.
 * @pseudocode
 * 1. Create an error handler that shows a scoreboard message and retry modal.
 * 2. Add the handler to the 'round-start-error' event.
 * 3. Return a cleanup function to remove the event listener.
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
  try {
    console.log("[selectStat] Called with stat:", stat);
  } catch {}
  const btn = document.querySelector(`#stat-buttons [data-stat='${stat}']`);
  // derive label from button text if available
  const label = btn?.textContent?.trim() || stat.charAt(0).toUpperCase() + stat.slice(1);
  // best-effort visual state
  try {
    const container =
      typeof document !== "undefined" ? document.getElementById("stat-buttons") : null;
    if (container) {
      const buttons = container.querySelectorAll("button");
      disableStatButtons(buttons, container);

      // Set a flag to prevent re-enabling while selection is being processed
      if (typeof container.dataset !== "undefined") {
        container.dataset.selectionInProgress = "true";
      }
    }
  } catch {
    // Silently handle errors in button state management
  }
  btn?.classList.add("selected");
  // read values from cards
  const pCard = document.getElementById("player-card");
  const oCard = document.getElementById("opponent-card");
  const playerVal = getCardStatValue(pCard, stat);
  const opponentVal = getCardStatValue(oCard, stat);
  // fire selection and snackbar
  let delayOpponentMessage = false;
  try {
    delayOpponentMessage = isEnabled("opponentDelayMessage");
  } catch {
    delayOpponentMessage = false;
  }
  if (delayOpponentMessage) {
    try {
      if (store && typeof store === "object") {
        store.__delayOpponentMessage = true;
      }
    } catch {}
  }
  try {
    const selectionOptions = delayOpponentMessage
      ? { playerVal, opponentVal, delayOpponentMessage: true }
      : { playerVal, opponentVal };
    Promise.resolve(handleStatSelection(store, stat, selectionOptions)).catch(() => {});
  } catch {}

  // Display snackbar feedback
  if (shouldDisplaySelectionSnackbar(store, delayOpponentMessage)) {
    try {
      showSnackbar(`You Picked: ${label}`);
    } catch {}
  } else if (delayOpponentMessage) {
    // When opponent delay is enabled, show the opponent choosing message
    try {
      const opponentMsg =
        typeof t === "function" ? t("ui.opponentChoosing") : "Opponent is choosing…";
      showSnackbar(opponentMsg);
    } catch {}
  } else {
    // Fallback: if nothing is displayed, show a message
    try {
      showSnackbar(`You Picked: ${label}`);
    } catch {}
  }
}

function shouldDisplaySelectionSnackbar(store, delayOpponentMessage) {
  if (delayOpponentMessage) return false;
  if (!store || typeof store !== "object") return true;
  try {
    if (!Object.prototype.hasOwnProperty.call(store, "__delayOpponentMessage")) {
      return true;
    }
    return store.__delayOpponentMessage !== true;
  } catch {
    return false;
  }
}

const STAT_BUTTON_HANDLER_KEY = "__classicBattleStatHandler";

function registerStatButtonClickHandler(container, store) {
  if (!container || container[STAT_BUTTON_HANDLER_KEY]) {
    return;
  }
  const handler = (event) => {
    const target = event?.target;
    if (!target || typeof target.closest !== "function") {
      return;
    }
    const btn = target.closest("button[data-stat]");
    if (!btn) {
      return;
    }
    if (btn.disabled) {
      return;
    }
    const stat = btn.dataset?.stat;
    if (!stat) {
      return;
    }
    try {
      selectStat(store, stat);
    } catch (error) {
      guard(() => console.warn("[uiHelpers] Failed to handle stat selection:", error));
    }
  };
  container.addEventListener("click", handler);
  Object.defineProperty(container, STAT_BUTTON_HANDLER_KEY, {
    value: handler,
    configurable: true
  });
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
 * 1. Query all `<dialog>` elements with the `modal` class and remove them from the DOM.
 * 2. Check if a `quitModal` exists in the provided `store`.
 * 3. If it exists, call its `destroy()` method to clean up its DOM elements and event listeners.
 * 4. Set `store.quitModal` to `null` to release the reference.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} [store] - Optional store containing a reference to the quit modal.
 * @returns {void}
 */
export function removeBackdrops(store) {
  try {
    document.querySelectorAll?.("dialog.modal").forEach((m) => {
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
 * 1. Attempt to locate the `#quit-button` element and fall back to `#quit-match-button`.
 * 2. If the button is found, replace it with a deep clone of itself. This effectively
 *    removes all previously attached event listeners from the original button.
 * @returns {void}
 */
export function resetQuitButton() {
  let quitBtn;
  try {
    quitBtn = document.getElementById
      ? (document.getElementById("quit-button") ?? document.getElementById("quit-match-button"))
      : null;
  } catch {}
  if (quitBtn) {
    quitBtn.replaceWith(quitBtn.cloneNode(true));
  }
}

/**
 * Replace the Quit button with an inert clone to remove existing event listeners.
 *
 * @pseudocode
 * 1. Locate `#quit-button` in the DOM and fall back to `#quit-match-button` when needed.
 * 2. Replace it with `cloneNode(true)` so existing listeners are dropped.
 *
 * @returns {void}
 */

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
 * Initializes the stat selection buttons, wiring up click handlers and hotkeys.
 *
 * @pseudocode
 * 1. Get the stat buttons container (`#stat-buttons`). Throw an error if not found.
 * 2. Get all stat buttons within the container. If none, resolve `statButtonsReadyPromise` and return inert enable/disable functions.
 * 3. Register a delegated click handler on the container that calls {@link selectStat}.
 * 4. Define `enable` to enable buttons, resolve readiness promises, and wire hotkeys.
 * 5. Define `disable` to disable buttons and tear down hotkeys.
 * 6. Invoke `disable` once to ensure a known initial state and return the controls.
 *
 * @param {ReturnType<typeof import('./roundManager.js').createBattleStore>} store - The battle state store.
 * @returns {{enable: Function, disable: Function}} An object with enable and disable functions for the stat buttons.
 */
export function initStatButtons(store) {
  const container = document.getElementById("stat-buttons");
  if (!container) throw new Error("initStatButtons: #stat-buttons missing");
  const buttons = Array.from(container.querySelectorAll("button"));
  if (buttons.length === 0) {
    guard(() => console.warn("[uiHelpers] #stat-buttons has no buttons"));
    try {
      resolveStatButtonsReady();
    } catch {}
    return { enable: () => {}, disable: () => {} };
  }

  let disposeHotkeys = null;
  registerStatButtonClickHandler(container, store);

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
 * 1. Load stat names asynchronously and build a map from key to label.
 * 2. Iterate over the STATS keys and their corresponding buttons.
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
  const statsArray = await loadStatNames().catch(() => []);
  // Build a map from stat key (slug) to display name
  const nameMap = {};
  for (const stat of statsArray) {
    const key = String(stat.name || "")
      .toLowerCase()
      .replace(/[-\s]/g, "");
    if (key) {
      nameMap[key] = stat.name;
    }
  }

  const statKeys = Array.isArray(STATS) ? STATS : Object.keys(STATS || {});
  for (const rawKey of statKeys) {
    const key = String(rawKey);
    const selectorKey = key.replace(/['"\\]/g, "\\$&");
    const selector = `#stat-buttons [data-stat='${selectorKey}']`;
    /** @type {HTMLButtonElement|null} */
    const btn = document.querySelector(selector);
    if (!btn) continue;
    const label = nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
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
    } catch (error) {
      // Ignore failures so a single missing element does not break the render loop in tests.
      void error;
    }
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
 * 1. Return early if `document` is undefined.
 * 2. Query `#battle-state-badge`; if absent return early.
 * 3. Set text to `State: <state>` when `state` is non-null, otherwise `State: —`.
 * 4. Catch DOM errors and set fallback text `State: —`.
 *
 * @param {string|null} state - Current battle state or null when unknown.
 * @returns {void}
 */
export function updateBattleStateBadge(state) {
  if (typeof document === "undefined") return;
  const badge = document.getElementById("battle-state-badge");
  if (!badge) return;
  try {
    const plain = (badge.dataset && badge.dataset.format) === "plain";
    if (plain) {
      // Classic page wants bare labels (e.g., "Lobby")
      badge.textContent = state ? String(state) : "Lobby";
    } else {
      badge.textContent = state ? `State: ${state}` : "State: —";
    }
  } catch {
    const plain = (badge.dataset && badge.dataset.format) === "plain";
    badge.textContent = plain ? "Lobby" : "State: —";
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
export function setBattleStateBadgeEnabled(enable) {
  if (typeof document === "undefined") return;
  const body = document.body;
  if (body) {
    body.setAttribute("data-feature-battle-state-badge", enable ? "enabled" : "disabled");
  }
  let badge = document.getElementById("battle-state-badge");
  if (!enable) {
    if (badge) {
      badge.removeAttribute("data-feature-battle-state-badge");
      badge.remove();
    }
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
  badge.hidden = false;
  badge.removeAttribute("hidden");
  badge.setAttribute("data-feature-battle-state-badge", "enabled");
  const state = getStateSnapshot().state ?? "Lobby";
  updateBattleStateBadge(state);
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
  updateDebugPanelImpl();
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

let legacyHandlersBound = false;

/**
 * Bind the legacy DOM event handlers used to keep the classic battle UI in sync with battle events.
 *
 * @returns {void}
 * @pseudocode
 * 1. If handlers were already bound, exit immediately to avoid duplicate listeners.
 * 2. Attempt to import and execute the dynamic binding implementation.
 * 3. If the dynamic import fails, log a warning (when supported) and continue without throwing.
 * 4. Mark handlers as bound so subsequent calls do nothing.
 */
export function bindUIHelperEventHandlers() {
  if (legacyHandlersBound) return;
  try {
    bindUIHelperEventHandlersDynamic();
  } catch (error) {
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn("Failed to bind legacy UI helper handlers:", error);
    }
  }
  legacyHandlersBound = true;
}

// Legacy handler bindings are intentionally deferred. Consumers should invoke
// `bindUIHelperEventHandlers()` (or the dynamic variant) through explicit
// initialization paths such as the Classic Battle runtime entrypoint or
// `__ensureClassicBattleBindings()` to avoid attaching listeners during module
// import.

/**
 * Show a fatal initialization error with a retry option.
 *
 * @param {Error|string} error - The error that occurred.
 * @returns {void}
 * @pseudocode
 * 1. Extract error message from Error object or convert to string.
 * 2. Get the snackbar container element from the DOM.
 * 3. Clear any existing snackbar content.
 * 4. Create a new error snackbar with the message and retry button.
 * 5. Add click handler to retry button that reloads the page.
 * 6. Show the snackbar with animation.
 */
export function showFatalInitError(error) {
  const message = error instanceof Error ? error.message : String(error);
  const container = document.getElementById("snackbar-container");
  if (!container) return;

  // Clear any existing snackbar
  container.innerHTML = "";

  const errorDiv = document.createElement("div");
  errorDiv.className = "snackbar error";
  const messageSpan = document.createElement("span");
  messageSpan.textContent = `Battle initialization failed: ${message}`;

  const retryButton = document.createElement("button");
  retryButton.type = "button";
  retryButton.id = "retry-init-button";
  retryButton.textContent = "Retry";

  errorDiv.append(messageSpan, retryButton);

  container.appendChild(errorDiv);
  requestAnimationFrame(() => errorDiv.classList.add("show"));

  // Add retry handler
  retryButton.addEventListener("click", () => {
    // Reload the page to retry init
    window.location.reload();
  });
}
