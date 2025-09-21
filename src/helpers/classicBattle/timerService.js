import { getDefaultTimer } from "../timerUtils.js";
import { startRound as engineStartRound } from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import { setSkipHandler } from "./skipHandler.js";
import { autoSelectStat } from "./autoSelectStat.js";
import { emitBattleEvent } from "./battleEvents.js";
import { isEnabled } from "../featureFlags.js";
import { skipRoundCooldownIfEnabled } from "./uiHelpers.js";
import { logTimerOperation, createComponentLogger } from "./debugLogger.js";

const timerLogger = createComponentLogger("TimerService");

import { realScheduler } from "../scheduler.js";
/**
 * @summary Re-export shared fallback timer scheduling helper.
 *
 * @pseudocode
 * 1. Forward `setupFallbackTimer` from the dedicated helper module.
 * 2. Preserve existing timerService imports for callers relying on the re-export.
 *
 * @returns {typeof import("./setupFallbackTimer.js").setupFallbackTimer}
 * Reference to the fallback timer helper.
 */
export { setupFallbackTimer } from "./setupFallbackTimer.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { getNextRoundControls } from "./roundManager.js";
import {
  hasReadyBeenDispatchedForCurrentCooldown,
  setReadyDispatchedForCurrentCooldown
} from "./roundReadyState.js";
import { guard } from "./guard.js";
import { safeGetSnapshot, isNextReady, resetReadiness } from "./timerUtils.js";
import { forceAutoSelectAndDispatch } from "./autoSelectHandlers.js";

/**
 * Accessor for the active Next-round cooldown controls.
 *
 * This is a re-export of `getNextRoundControls` from `roundManager.js`.
 * It returns the current `timer` control object and a `resolveReady` function
 * used to advance the round when the cooldown completes or when manually
 * advanced by the Next button.
 *
 * @pseudocode
 * 1. Forward call to `roundManager.getNextRoundControls()` and return its value.
 *
 * @returns {{timer: {stop: () => void} | null, resolveReady: (() => void) | null}}
 */
export { getNextRoundControls } from "./roundManager.js";

// Track timeout for cooldown warning to avoid duplicates.
let cooldownWarningTimeoutId = null;
// Prevent re-entrant Next clicks from advancing multiple rounds at once.
let nextClickInFlight = false;

/**
 * Get the round counter element from the DOM root.
 *
 * @pseudocode
 * 1. Try to get element by ID using getElementById if available.
 * 2. Fall back to querySelector if getElementById is not available.
 * 3. Return the element or null if not found or on error.
 *
 * @param {Document|Element} root - DOM root to search in
 * @returns {Element|null} Round counter element or null
 */
function getRoundCounterElement(root) {
  try {
    return root.getElementById
      ? root.getElementById("round-counter")
      : root.querySelector("#round-counter");
  } catch {
    return null;
  }
}

/**
 * Read the currently displayed round number from the DOM.
 *
 * @pseudocode
 * 1. Get the round counter element from the root.
 * 2. Extract round number from element text using regex.
 * 3. Parse the extracted number and validate it's finite.
 * 4. Return the round number or null if not found/invalid.
 *
 * @param {Document|Element} root - DOM root to search in
 * @returns {number|null} Current round number or null
 */
function readDisplayedRound(root) {
  const el = getRoundCounterElement(root);
  if (!el) return null;
  const match = /Round\s*(\d+)/i.exec(String(el.textContent || ""));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/**
 * Write the round number to the round counter element.
 *
 * @pseudocode
 * 1. Get the round counter element from the root.
 * 2. Validate that element exists and value is a finite number.
 * 3. Update element text content with formatted round number.
 *
 * @param {Document|Element} root - DOM root to search in
 * @param {number} value - Round number to display
 */
function writeRoundCounter(root, value) {
  const el = getRoundCounterElement(root);
  if (!el || !Number.isFinite(value)) return;
  try {
    const highest = Number((globalThis.__highestDisplayedRound ?? el.dataset?.highestRound) || 0);
    const priorContext = globalThis.__previousRoundCounterContext;
    if (priorContext === "regular" && Number.isFinite(highest) && highest >= 1 && value < highest) {
      return;
    }
  } catch {}
  el.textContent = `Round ${value}`;
}

/**
 * Lightweight accessors for the diagnostic round-tracking globals.
 *
 * @summary Centralizes reads/writes for `__highestDisplayedRound` and context flags
 * to make dependencies explicit and easier to reason about.
 */
const roundTrackingState = {
  /**
   * @param {Document|Element} root
   * @returns {{counterEl: Element|null, highest: number|null, lastContext: string, previousContext: string}}
   */
  read(root) {
    const counterEl = getRoundCounterElement(root);

    const globalHighest = Number(globalThis.__highestDisplayedRound ?? NaN);
    const datasetHighest = Number(counterEl?.dataset?.highestRound ?? NaN);

    let highest = null;
    if (Number.isFinite(globalHighest) && globalHighest >= 1) {
      highest = globalHighest;
    } else if (Number.isFinite(datasetHighest) && datasetHighest >= 1) {
      highest = datasetHighest;
    }

    const lastContext =
      typeof globalThis.__lastRoundCounterContext === "string"
        ? globalThis.__lastRoundCounterContext
        : "";
    const previousContext =
      typeof globalThis.__previousRoundCounterContext === "string"
        ? globalThis.__previousRoundCounterContext
        : "";

    return {
      counterEl,
      highest,
      lastContext,
      previousContext
    };
  },
  /**
   * @param {{counterEl: Element|null, highest?: number|null, lastContext?: string|null, previousContext?: string|null}} state
   * @returns {void}
   */
  write({ counterEl, highest, lastContext, previousContext }) {
    if (Number.isFinite(highest) && highest >= 1) {
      try {
        globalThis.__highestDisplayedRound = highest;
      } catch {}
      if (counterEl && counterEl.dataset) {
        const prior = Number(counterEl.dataset.highestRound || 0);
        const stable = Number.isFinite(prior) && prior >= 1 ? Math.max(prior, highest) : highest;
        counterEl.dataset.highestRound = String(stable);
      }
    }

    if (lastContext !== undefined) {
      globalThis.__lastRoundCounterContext = lastContext;
    }
    if (previousContext !== undefined) {
      globalThis.__previousRoundCounterContext = previousContext;
    }
  }
};

/**
 * Determine whether the engine has already advanced the round.
 *
 * @pseudocode
 * 1. Exit early when no advance context has been recorded or highest is unset.
 * 2. Treat a recorded next round or matching prior advance as authoritative.
 *
 * @param {{
 *   contextReportedAdvance: boolean,
 *   recordedNextRound: boolean,
 *   priorAdvanceMatchesDisplay: boolean,
 *   hasRecordedHighest: boolean
 * }} params - Diagnostic flags derived from round tracking state.
 * @returns {boolean}
 */
function determineEngineAdvanceState({
  contextReportedAdvance,
  recordedNextRound,
  priorAdvanceMatchesDisplay,
  hasRecordedHighest
}) {
  if (!contextReportedAdvance || !hasRecordedHighest) {
    return false;
  }

  return recordedNextRound || priorAdvanceMatchesDisplay;
}

/**
 * Transition events required when advancing from states other than `cooldown`.
 *
 * `advanceWhenReady` consults this table to dispatch an interrupt that moves the
 * state machine into `cooldown` before emitting `ready`.
 *
 * @type {Record<string, {event: string, payload: {reason: string}}>} state → transition mapping.
 */
const ADVANCE_TRANSITIONS = {
  roundDecision: { event: "interrupt", payload: { reason: "advanceNextFromNonCooldown" } },
  waitingForPlayerAction: { event: "interrupt", payload: { reason: "advanceNextFromNonCooldown" } }
};

// Skip handler utilities moved to skipHandler.js

/**
 * @summary Dispatch the cooldown "ready" event at most once per cycle.
 *
 * @pseudocode
 * 1. If the current cooldown already dispatched "ready", resolve the promise and exit.
 * 2. Otherwise mark the readiness flag, dispatch the event, and resolve the promise.
 * 3. Return whether the call performed a new dispatch for callers needing flow control.
 *
 * @param {(() => void)|null} resolveReady - Resolver passed from cooldown controls.
 * @returns {Promise<boolean>} True when the helper dispatched "ready".
 */
async function dispatchReadyOnce(resolveReady) {
  const shouldResolve = typeof resolveReady === "function";
  if (hasReadyBeenDispatchedForCurrentCooldown()) {
    if (shouldResolve) {
      guard(() => resolveReady());
    }
    return false;
  }

  setReadyDispatchedForCurrentCooldown(true);
  let dispatchSucceeded = true;
  /** @type {unknown} */
  let dispatchError = null;

  try {
    const result = await dispatchBattleEvent("ready");
    if (result === false) {
      dispatchSucceeded = false;
    }
  } catch (error) {
    dispatchSucceeded = false;
    dispatchError = error;
  }

  if (!dispatchSucceeded) {
    setReadyDispatchedForCurrentCooldown(false);
  }
  if (shouldResolve) {
    guard(() => resolveReady());
  }

  if (dispatchError !== null) {
    throw dispatchError;
  }

  return dispatchSucceeded;
}

/**
 * Advance to the next round when the cooldown is ready.
 *
 * @pseudocode
 * 1. Disable the next button and remove ready state.
 * 2. Get current state snapshot to determine transition needs.
 * 3. If not in cooldown state, dispatch transition event first.
 * 4. Dispatch ready event to advance the round.
 * 5. Call resolveReady callback if provided.
 * 6. Clear the skip handler.
 *
 * @param {HTMLButtonElement} btn - Next button element
 * @param {Function} resolveReady - Callback to resolve ready state
 * @returns {Promise<void>}
 */
export async function advanceWhenReady(btn, resolveReady) {
  const dataset = btn.dataset || (btn.dataset = {});
  const wasDisabled = btn.disabled === true;
  const hadNextReady = Object.prototype.hasOwnProperty.call(dataset, "nextReady");
  const previousNextReady = dataset.nextReady;
  btn.disabled = true;
  delete dataset.nextReady;
  const { state } = safeGetSnapshot();
  const t = state && state !== "cooldown" ? ADVANCE_TRANSITIONS[state] : null;
  if (t) {
    try {
      await dispatchBattleEvent(t.event, t.payload);
    } catch {}
  }
  let dispatched = false;
  try {
    dispatched = await dispatchReadyOnce(resolveReady);
  } catch (error) {
    btn.disabled = wasDisabled;
    if (hadNextReady) {
      dataset.nextReady = previousNextReady;
    } else {
      delete dataset.nextReady;
    }
    throw error;
  }
  if (!dispatched) {
    btn.disabled = wasDisabled;
    if (hadNextReady) {
      dataset.nextReady = previousNextReady;
    } else {
      delete dataset.nextReady;
    }
    return;
  }
  setSkipHandler(null);
}

/**
 * Cancel an active cooldown timer or advance immediately when already in cooldown.
 *
 * @pseudocode
 * 1. If a `timer` object is provided:
 *    a. Call `timer.stop()` to cancel the countdown.
 *    b. Dispatch `ready`, call `resolveReady`, and clear the skip handler.
 *    c. Return early.
 * 2. Otherwise, if the state machine is in `cooldown` (or unknown in tests),
 *    dispatch `ready`, call `resolveReady`, and clear the skip handler.
 *
 * @param {HTMLButtonElement} _btn - Next button element (unused but provided by callers).
 * @param {{stop: () => void}|null} timer - Active cooldown timer controls.
 * @param {(() => void)|null} resolveReady - Resolver for the ready promise.
 * @returns {Promise<void>}
 */
export async function cancelTimerOrAdvance(_btn, timer, resolveReady) {
  if (timer) {
    timer.stop();
    // Clear existing handler before advancing so the next round's handler
    // installed during `ready` remains intact.
    setSkipHandler(null);
    await dispatchReadyOnce(resolveReady);
    return;
  }
  // No active timer controls: if we're in cooldown (or state is unknown in
  // this module instance during tests), advance immediately.
  const { state } = safeGetSnapshot();
  if (state === "cooldown" || !state) {
    setSkipHandler(null);
    await dispatchReadyOnce(resolveReady);
  }
}

/**
 * Click handler for the Next button.
 *
 * Unconditionally skips the inter-round cooldown by emitting the legacy
 * `countdownFinished` event (and the newer `round.start` signal), then
 * delegates to `advanceWhenReady` when the button is marked ready or to
 * `cancelTimerOrAdvance` to stop an active timer / advance when in cooldown.
 *
 * @pseudocode
 * 1. Ask `skipRoundCooldownIfEnabled` to execute its fast path when available.
 * 2. Emit `countdownFinished` via the battle event bus.
 * 3. Read `controls` (timer and resolveReady) from `getNextRoundControls()` when not supplied.
 * 4. If the Next button element has `data-next-ready="true"`, call `advanceWhenReady`.
 * 5. Otherwise call `cancelTimerOrAdvance` to either stop an active timer or dispatch `ready`.
 *
 * @param {MouseEvent} _evt - Click event.
 * @param {{timer: {stop: () => void} | null, resolveReady: (() => void) | null}} [controls=getNextRoundControls()]
 * - Timer controls returned from `startCooldown`.
 * @returns {Promise<void>}
 */
export async function onNextButtonClick(_evt, controls = getNextRoundControls(), options = {}) {
  if (nextClickInFlight) {
    timerLogger.debug("[next] click ignored while advance in flight");
    return;
  }

  nextClickInFlight = true;
  try {
    let skipHandled = false;
    const skipHintEnabled = skipRoundCooldownIfEnabled({
      onSkip: () => {
        setSkipHandler(null);
        emitBattleEvent("countdownFinished");
        emitBattleEvent("round.start");
        skipHandled = true;
      }
    });
    if (skipHintEnabled && skipHandled) {
      timerLogger.debug("skipRoundCooldown hint consumed during Next click");
    }
    if (!skipHandled) {
      emitBattleEvent("countdownFinished");
      emitBattleEvent("round.start");
    }

    const { timer = null, resolveReady = null } = controls || {};
    const root = options.root || document;
    const displayedRoundBefore = readDisplayedRound(root);
    const btn = root.getElementById
      ? root.getElementById("next-button")
      : root.querySelector("#next-button");
    if (!btn) {
      return;
    }

    // Defensive: if a stale readiness flag is present outside of `cooldown`,
    // clear it so we don't advance via an early-ready path.
    const { state } = safeGetSnapshot();
    if (isNextReady(btn) && state && state !== "cooldown") {
      resetReadiness(btn);
      guard(() => console.warn("[next] cleared early readiness outside cooldown"));
    }

    // Manual clicks must attempt to advance regardless of the `skipRoundCooldown`
    // feature flag. The flag only affects automatic progression, never user
    // intent signaled via the Next button.
    const strategies = {
      advance: () => advanceWhenReady(btn, resolveReady),
      cancel: () => cancelTimerOrAdvance(btn, timer, resolveReady)
    };
    const action = isNextReady(btn) ? "advance" : "cancel";
    await strategies[action]();

    const displayedRoundAfter = readDisplayedRound(root);
    if (
      displayedRoundBefore !== null &&
      (displayedRoundAfter === null || displayedRoundAfter === displayedRoundBefore)
    ) {
      const tracking = roundTrackingState.read(root);
      const { counterEl, highest: recordedHighest, lastContext, previousContext } = tracking;
      const hasRecordedHighest = typeof recordedHighest === "number";
      const fallbackBase = displayedRoundBefore + 1;

      let fallbackTarget = fallbackBase;
      if (hasRecordedHighest) {
        fallbackTarget = Math.max(fallbackTarget, recordedHighest);
      }

      const contextReportedAdvance = lastContext === "advance" || previousContext === "advance";
      const recordedNextRound = hasRecordedHighest && recordedHighest >= fallbackBase;
      const priorAdvanceMatchesDisplay =
        previousContext === "advance" &&
        hasRecordedHighest &&
        recordedHighest === displayedRoundBefore;
      const engineAlreadyAdvanced = determineEngineAdvanceState({
        contextReportedAdvance,
        recordedNextRound,
        priorAdvanceMatchesDisplay,
        hasRecordedHighest
      });
      if (engineAlreadyAdvanced && hasRecordedHighest) {
        fallbackTarget = recordedHighest;
      }

      if (Number.isFinite(fallbackTarget) && fallbackTarget >= 1) {
        writeRoundCounter(root, fallbackTarget);
        const nextRecordedHighest = hasRecordedHighest
          ? Math.max(recordedHighest, fallbackTarget)
          : fallbackTarget;
        const shouldMarkFallbackContext =
          fallbackTarget > displayedRoundBefore && !engineAlreadyAdvanced;

        try {
          roundTrackingState.write({
            counterEl,
            highest: nextRecordedHighest,
            lastContext: shouldMarkFallbackContext ? "fallback" : undefined,
            previousContext: shouldMarkFallbackContext ? lastContext || null : undefined
          });
        } catch (error) {
          guard(() => console.warn("[timerService] Failed to update round tracking state:", error));
        }
      }
    }

    if (cooldownWarningTimeoutId !== null) {
      realScheduler.clearTimeout(cooldownWarningTimeoutId);
    }
    cooldownWarningTimeoutId = realScheduler.setTimeout(() => {
      const { state } = safeGetSnapshot();
      if (state === "cooldown") {
        guard(() => console.warn("[next] stuck in cooldown"));
      }
      cooldownWarningTimeoutId = null;
    }, 1000);
  } catch (error) {
    timerLogger.error("[next] error during click handling", error);
  } finally {
    nextClickInFlight = false;
  }
}

// `getNextRoundControls` is re-exported from `roundManager.js` and returns
// the active controls for the Next-round cooldown (timer, resolveReady, ready).

/**
 * Resolve the round timer duration and provide a restore callback for temporary UI.
 *
 * @param {{showTemporaryMessage?: (msg: string) => () => void}} [scoreboardApi=scoreboard]
 * - Scoreboard facade used to surface syncing state.
 * @returns {Promise<{duration: number, synced: boolean, restore: () => void}>}
 * @summary Resolve round timer duration with scoreboard fallbacks.
 * @pseudocode
 * 1. Default duration to 30 seconds and attempt to read the configured value.
 * 2. If the value is unavailable, mark the timer as unsynced and show "Waiting…".
 * 3. Return the resolved duration, synced flag, and a restore callback.
 */
export async function resolveRoundTimerDuration({ showTemporaryMessage } = scoreboard) {
  let duration = 30;
  let synced = true;

  try {
    const val = await getDefaultTimer("roundTimer");
    if (typeof val === "number") {
      duration = val;
    } else {
      synced = false;
    }
  } catch {
    synced = false;
  }

  let restore = () => {};
  if (!synced && typeof showTemporaryMessage === "function") {
    try {
      restore = showTemporaryMessage(t("ui.waiting"));
    } catch {
      restore = () => {};
    }
  }

  return { duration, synced, restore };
}

/**
 * Prime the scoreboard and DOM display with the starting timer value.
 *
 * @param {{
 *   duration: number,
 *   scoreboardApi?: { updateTimer?: (value: number) => void },
 *   root?: Document | HTMLElement | null
 * }} params - Configuration for priming the timer display.
 * @returns {void}
 * @summary Ensure the UI shows the starting timer value immediately.
 * @pseudocode
 * 1. If the duration is finite, update the scoreboard timer.
 * 2. Update the DOM element `#next-round-timer` when present.
 */
export function primeTimerDisplay({
  duration,
  scoreboardApi = scoreboard,
  root = typeof document !== "undefined" ? document : null
} = {}) {
  if (!Number.isFinite(duration)) return;

  try {
    scoreboardApi?.updateTimer?.(duration);
  } catch {}

  if (!root) return;

  try {
    const el = root.getElementById
      ? root.getElementById("next-round-timer")
      : root.querySelector("#next-round-timer");
    if (el) {
      el.textContent = `Time Left: ${duration}s`;
    }
  } catch {}
}

/**
 * Configure tick, drift, and expiration callbacks on the provided timer.
 *
 * @param {{
 *   on: (event: "tick" | "expired" | "drift", handler: Function) => void
 * }} timer - Round timer controls from `createRoundTimer`.
 * @param {{
 *   onExpired: () => void | Promise<void>,
 *   scoreboardApi?: {
 *     updateTimer?: (value: number) => void,
 *     showMessage?: (msg: string) => void
 *   },
 *   emitEvent?: typeof emitBattleEvent,
 *   showSnack?: typeof showSnackbar,
 *   translate?: typeof t,
 *   documentRef?: Document | HTMLElement | null
 * }} [options]
 * @returns {{ tickHandler: (remaining: number) => void }}
 * @summary Wire timer callbacks for tick updates, expiration, and drift fallbacks.
 * @pseudocode
 * 1. Register a scoreboard-updating tick handler and emit telemetry ticks.
 * 2. Attach the provided expiration handler.
 * 3. On drift, prefer snackbar when a round message exists; otherwise use scoreboard.
 */
export function configureTimerCallbacks(
  timer,
  {
    onExpired,
    scoreboardApi = scoreboard,
    emitEvent = emitBattleEvent,
    showSnack = showSnackbar,
    translate = t,
    documentRef = typeof document !== "undefined" ? document : null
  } = {}
) {
  const tickHandler = (remaining) => {
    try {
      scoreboardApi?.updateTimer?.(remaining);
    } catch {}
    if (documentRef) {
      try {
        const el = documentRef.getElementById
          ? documentRef.getElementById("next-round-timer")
          : documentRef.querySelector("#next-round-timer");
        if (el) {
          if (typeof remaining === "number") {
            const clamped = Math.max(0, Number.isFinite(remaining) ? remaining : 0);
            el.textContent = `Time Left: ${clamped}s`;
          } else {
            el.textContent = "";
          }
        }
      } catch {}
    }
  };

  try {
    timer?.on?.("tick", tickHandler);
  } catch {}

  timer?.on?.("tick", (remaining) => {
    try {
      emitEvent?.("round.timer.tick", {
        remainingMs: Math.max(0, Number(remaining) || 0) * 1000
      });
    } catch {}
  });

  if (typeof onExpired === "function") {
    try {
      timer.on("expired", onExpired);
    } catch {}
  }

  timer?.on?.("drift", () => {
    let msgEl = null;
    const doc = documentRef;
    try {
      if (doc) {
        msgEl = doc.getElementById
          ? doc.getElementById("round-message")
          : doc.querySelector("#round-message");
      }
    } catch {
      msgEl = null;
    }

    const waiting = translate?.("ui.waiting");
    if (msgEl && msgEl.textContent) {
      try {
        showSnack?.(waiting);
      } catch {}
    } else {
      try {
        scoreboardApi?.showMessage?.(waiting);
      } catch {}
    }
  });

  return { tickHandler };
}

/**
 * Create the round timer expiration handler with auto-select coordination.
 *
 * @param {{
 *   duration: number,
 *   onExpiredSelect: (stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>,
 *   store?: { selectionMade?: boolean } | null,
 *   scoreboardApi?: { clearTimer?: () => void },
 *   isFeatureEnabled?: (flag: string) => boolean,
 *   autoSelect?: typeof autoSelectStat,
 *   emitEvent?: typeof emitBattleEvent,
 *   dispatchEvent?: typeof dispatchBattleEvent,
 *   setSkip?: typeof setSkipHandler
 * }} params - Dependencies required for expiration handling.
 * @returns {() => Promise<void>}
 * @summary Handle timer expiration with auto-select and timeout dispatch.
 * @pseudocode
 * 1. Clear the skip handler and scoreboard timer, then emit diagnostic events.
 * 2. If a selection already exists, exit early.
 * 3. Emit `roundTimeout`, optionally auto-select when enabled, and dispatch `timeout`.
 * 4. When auto-select disabled, resolve via fallback stat selection.
 */
export function handleTimerExpiration({
  duration,
  onExpiredSelect,
  store = null,
  scoreboardApi = scoreboard,
  isFeatureEnabled = isEnabled,
  autoSelect = autoSelectStat,
  emitEvent = emitBattleEvent,
  dispatchEvent = dispatchBattleEvent,
  setSkip = setSkipHandler
}) {
  return async () => {
    logTimerOperation("expired", "selectionTimer", duration, {
      store: store ? { selectionMade: store.selectionMade } : null
    });

    try {
      setSkip?.(null);
    } catch {}

    try {
      scoreboardApi?.clearTimer?.();
    } catch {}

    try {
      emitEvent?.("round.timer.expired");
    } catch {}

    const alreadyPicked = !!(store && store.selectionMade);
    try {
      console.warn(`[test] onExpired: selectionMade=${alreadyPicked}`);
    } catch {}

    if (alreadyPicked) {
      return;
    }

    try {
      emitEvent?.("roundTimeout");
    } catch {}

    const featureCheck =
      typeof isFeatureEnabled === "function"
        ? isFeatureEnabled("autoSelect")
        : Boolean(isFeatureEnabled);
    const selecting = featureCheck
      ? (async () => {
          try {
            await autoSelect?.(
              onExpiredSelect,
              typeof process !== "undefined" && process.env && process.env.VITEST ? 0 : undefined
            );
          } catch {}
        })()
      : Promise.resolve();

    try {
      await dispatchEvent?.("timeout");
    } catch {}

    await selecting;

    if (!featureCheck) {
      try {
        await onExpiredSelect("speed", { delayOpponentMessage: true });
      } catch {}
    }
  };
}

/**
 * Start the round timer and auto-select a random stat on expiration.
 *
 * @pseudocode
 * 1. Determine timer duration using `getDefaultTimer('roundTimer')`.
 *    - On error, temporarily show "Waiting…" and fallback to 30 seconds.
 * 2. Start the timer via `engineStartRound` and monitor for drift.
 *    - On drift trigger auto-select logic and dispatch the outcome event.
 * 3. Register a skip handler that stops the timer and triggers `onExpired`.
 * 4. When expired:
 *    - Dispatch "timeout" to let the state machine interrupt the round.
 *    - If `isEnabled('autoSelect')`, concurrently call `autoSelectStat` to
 *      pick a stat and invoke `onExpiredSelect` with `delayOpponentMessage`.
 *
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>} onExpiredSelect
 * - Callback to handle stat auto-selection.
 * @param {{selectionMade?: boolean}|null} [store=null] - Battle state store.
 * @returns {Promise<ReturnType<typeof createRoundTimer>>} Resolves with timer controls.
 */
export async function startTimer(onExpiredSelect, store = null, dependencies = {}) {
  const {
    scoreboardApi = scoreboard,
    root = typeof document !== "undefined" ? document : null,
    emitEvent = emitBattleEvent,
    dispatchEvent = dispatchBattleEvent,
    setSkip = setSkipHandler,
    featureCheck = isEnabled,
    autoSelect = autoSelectStat,
    showSnack = showSnackbar,
    translate = t,
    startRound = engineStartRound
  } = dependencies;

  const { duration, synced, restore } = await resolveRoundTimerDuration(scoreboardApi);

  timerLogger.info("Starting selection timer", {
    initialDuration: duration,
    synced,
    hasStore: !!store,
    selectionMade: store?.selectionMade
  });

  primeTimerDisplay({ duration, scoreboardApi, root });

  const onExpired = handleTimerExpiration({
    duration,
    onExpiredSelect,
    store,
    scoreboardApi,
    isFeatureEnabled: featureCheck,
    autoSelect,
    emitEvent,
    dispatchEvent,
    setSkip
  });

  const timer = createRoundTimer({
    starter: startRound,
    onDriftFail: () => forceAutoSelectAndDispatch(onExpiredSelect)
  });

  configureTimerCallbacks(timer, {
    onExpired,
    scoreboardApi,
    emitEvent,
    showSnack,
    translate,
    documentRef: root
  });

  try {
    setSkip?.(() => timer.stop());
  } catch {}

  timer.start(duration);
  restore();
  return timer;
}

/**
 * Handle stalled stat selection by prompting the player and auto-selecting a
 * random stat.
 *
 * @pseudocode
 * 1. Display "Stat selection stalled" via `showSnackbar`.
 * 2. If auto-select is disabled, surface the prompt via the scoreboard.
 * 3. After `timeoutMs` milliseconds call `autoSelectStat(onSelect)`.
 *
 * @param {{autoSelectId: ReturnType<typeof setTimeout> | null}} store
 * - Battle state store.
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => void} onSelect
 * - Callback to handle stat selection.
 * @param {number} [timeoutMs=5000] - Delay before auto-selecting.
 */
/**
 * Handle stalled stat selection by prompting the player and scheduling auto-select.
 *
 * Presents a stalled message, optionally uses the scoreboard when auto-select
 * is disabled, and schedules `autoSelectStat(onSelect)` after `timeoutMs`.
 *
 * @pseudocode
 * 1. Schedule a timeout to show the stalled snackbar and emit `statSelectionStalled`.
 * 2. If `autoSelect` is enabled, schedule the countdown toast and call `autoSelectStat(onSelect)`.
 * 3. Store the scheduled timeout id on `store.autoSelectId` for later cancellation.
 *
 * @param {{autoSelectId: ReturnType<typeof setTimeout> | null}} store - Battle state store.
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => void} onSelect - Callback to handle stat selection.
 * @param {number} [timeoutMs=5000] - Delay before auto-selecting.
 * @param {{setTimeout: Function}} [scheduler=realScheduler] - Scheduler used to schedule timers (testable).
 * @returns {void}
 */
