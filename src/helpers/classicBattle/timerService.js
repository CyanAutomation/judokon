import { getDefaultTimer } from "../timerUtils.js";
import { startRound as engineStartRound } from "../BattleEngine.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import { setSkipHandler } from "./skipHandler.js";
import { autoSelectStat } from "./autoSelectStat.js";
import { emitBattleEvent, onBattleEvent, getBattleEventTarget } from "./battleEvents.js";
import { isEnabled } from "../featureFlags.js";
import { skipRoundCooldownIfEnabled } from "./uiHelpers.js";
import { logTimerOperation, createComponentLogger } from "./debugLogger.js";
import { resetSelectionFinalized } from "./selectionState.js";
import { attachCooldownRenderer } from "../CooldownRenderer.js";
import { attachCountdownCoordinator, emitCountdownFinished } from "./countdownCoordinator.js";

const timerLogger = createComponentLogger("TimerService");

import { realScheduler } from "../scheduler.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import {
  computeOpponentPromptWaitBudget,
  waitForDelayedOpponentPromptDisplay,
  DEFAULT_PROMPT_POLL_INTERVAL_MS
} from "./opponentPromptWaiter.js";
import { isOpponentPromptReady } from "./opponentPromptTracker.js";
import { getNextRoundControls } from "./roundManager.js";
import { guard } from "./guard.js";
import { safeGetSnapshot } from "./timerUtils.js";
import { forceAutoSelectAndDispatch } from "./autoSelectHandlers.js";

// Track timeout for cooldown warning to avoid duplicates.
let cooldownWarningTimeoutId = null;
// Prevent re-entrant Next clicks from advancing multiple rounds at once.
let nextClickInFlight = false;

/** @type {{ timer: ReturnType<typeof createRoundTimer>, detach: (() => void) | null }|null} */
let activeCountdown = null;

function clearActiveCountdown() {
  if (!activeCountdown) return;
  const { timer, detach } = activeCountdown;
  if (typeof detach === "function") {
    try {
      detach();
    } catch {}
  }
  try {
    timer.stop();
  } catch {}
  activeCountdown = null;
}

function handleCountdownExpired() {
  setSkipHandler(null);
  activeCountdown = null;
  emitBattleEvent("round.start");
}

function resolveOpponentPromptWait() {
  let shouldWaitForPrompt = false;
  let promptBudget = null;
  let rendererOptions = {};
  try {
    const readyState = typeof isOpponentPromptReady === "function" ? isOpponentPromptReady() : null;
    shouldWaitForPrompt = readyState !== true && readyState !== null;
  } catch {
    shouldWaitForPrompt = true;
  }
  if (!shouldWaitForPrompt) {
    return { shouldWaitForPrompt, promptBudget, rendererOptions };
  }
  try {
    promptBudget = computeOpponentPromptWaitBudget();
  } catch {
    promptBudget = null;
  }
  if (promptBudget && Number.isFinite(promptBudget.totalMs) && promptBudget.totalMs > 0) {
    rendererOptions = {
      waitForOpponentPrompt: true,
      maxPromptWaitMs: promptBudget.totalMs,
      opponentPromptBufferMs: promptBudget.bufferMs,
      promptPollIntervalMs: DEFAULT_PROMPT_POLL_INTERVAL_MS
    };
  } else {
    shouldWaitForPrompt = false;
  }
  return { shouldWaitForPrompt, promptBudget, rendererOptions };
}

async function waitForOpponentPrompt(promptBudget, rendererOptions) {
  let timeoutId = null;
  try {
    const waitPromise = waitForDelayedOpponentPromptDisplay(promptBudget, {
      intervalMs: rendererOptions.promptPollIntervalMs
    });
    const maxWaitMs = Number(promptBudget.totalMs);
    if (Number.isFinite(maxWaitMs) && maxWaitMs > 0 && typeof setTimeout === "function") {
      const timeoutPromise = new Promise((resolve) => {
        timeoutId = setTimeout(resolve, maxWaitMs);
      });
      await Promise.race([waitPromise, timeoutPromise]);
    } else {
      await waitPromise;
    }
  } catch (error) {
    if (
      typeof process !== "undefined" &&
      process?.env?.NODE_ENV !== "production" &&
      typeof console !== "undefined" &&
      typeof console.warn === "function"
    ) {
      console.warn("waitForDelayedOpponentPromptDisplay failed:", error);
    }
  } finally {
    if (timeoutId !== null && typeof clearTimeout === "function") {
      clearTimeout(timeoutId);
    }
  }
}

async function startCountdownSequence(duration, onFinished) {
  clearActiveCountdown();

  const timer = createRoundTimer();
  const { shouldWaitForPrompt, promptBudget, rendererOptions } = resolveOpponentPromptWait();
  const coordinator = attachCountdownCoordinator({
    timer,
    duration,
    renderer: attachCooldownRenderer,
    rendererOptions,
    onFinished: () => {
      handleCountdownExpired();
      if (typeof onFinished === "function") {
        onFinished();
      }
    }
  });
  activeCountdown = { timer, detach: coordinator.detach };

  const countdownSnapshot = activeCountdown;
  if (!activeCountdown) {
    return;
  }

  if (shouldWaitForPrompt && promptBudget) {
    await waitForOpponentPrompt(promptBudget, rendererOptions);
  }

  if (!activeCountdown || activeCountdown !== countdownSnapshot) {
    return;
  }
  timer.start(duration);
}

async function handleCountdownStartEvent(e) {
  let skipHandled = false;
  const skipEnabled =
    skipRoundCooldownIfEnabled?.({
      onSkip: () => {
        emitCountdownFinished();
        handleCountdownExpired();
        skipHandled = true;
      }
    }) ?? false;
  if (skipEnabled && skipHandled) {
    return;
  }
  const { duration, onFinished } = e.detail || {};
  if (typeof duration !== "number") return;
  try {
    await startCountdownSequence(duration, onFinished);
  } catch (err) {
    console.error("Error in countdownStart event handler:", err);
  }
}

function bindCountdownEventHandlers() {
  onBattleEvent("countdownStart", handleCountdownStartEvent);
}

/**
 * Bind countdown handlers once per battle event target.
 *
 * @pseudocode
 * 1. Fetch the shared battle event target.
 * 2. Track bound targets via a WeakSet on the global object.
 * 3. Skip binding when the target was already handled.
 * 4. Otherwise attach countdown event handlers.
 *
 * @returns {void}
 */
export function bindCountdownEventHandlersOnce() {
  let shouldBind = true;
  try {
    const KEY = "__cbCountdownBoundTargets";
    const target = getBattleEventTarget();
    if (target) {
      const set = (globalThis[KEY] ||= new WeakSet());
      if (set.has(target)) shouldBind = false;
      else set.add(target);
    }
  } catch {}
  if (shouldBind) {
    bindCountdownEventHandlers();
  }
}

/**
 * Resolve the active battle store for Next-button processing.
 *
 * @param {{selectionMade?: boolean}|null} [store=null] - Candidate store provided by caller.
 * @returns {{selectionMade?: boolean}|null} Active battle store when available.
 * @pseudocode
 * 1. Return the caller-provided store when it looks like an object.
 * 2. Otherwise fall back to `window.battleStore` when present.
 * 3. Return null when no store can be resolved.
 */
function resolveActiveBattleStore(store = null) {
  if (store && typeof store === "object") {
    return store;
  }

  if (typeof window !== "undefined" && window?.battleStore) {
    return window.battleStore;
  }

  return null;
}

/**
 * Click handler for the Next button.
 *
 * Emits a single `skipCooldown` intent to let the engine decide when to
 * advance the round.
 *
 * @pseudocode
 * 1. Ignore clicks when the button is disabled or another click is in-flight.
 * 2. If cooldown controls are available, emit `skipCooldown` on the battle event bus.
 * 3. Resolve the active battle store from parameters or global battle context.
 * 4. Always reset selection finalization state on exit.
 *
 * @param {MouseEvent} _evt - Click event.
 * @param {{timer: {stop: () => void} | null, resolveReady: (() => void) | null}} [controls=getNextRoundControls()]
 * - Timer controls returned from `startCooldown`.
 * @param {{selectionMade?: boolean}|null} [store=null] - Optional battle store reference for selection reset state.
 * @returns {Promise<void>}
 */
export async function onNextButtonClick(_evt, controls = getNextRoundControls(), store = null) {
  const activeStore = resolveActiveBattleStore(store);
  const btn =
    _evt?.target ||
    document.getElementById("next-button") ||
    document.querySelector('[data-role="next-round"]');
  if (!btn || btn?.disabled) return;

  if (nextClickInFlight) {
    timerLogger.debug("[next] click ignored while advance in flight");
    return;
  }

  nextClickInFlight = true;
  try {
    if (controls) {
      emitBattleEvent("skipCooldown", { source: "next-button" });

      if (cooldownWarningTimeoutId !== null) {
        realScheduler.clearTimeout(cooldownWarningTimeoutId);
      }
      cooldownWarningTimeoutId = realScheduler.setTimeout(() => {
        const { state } = safeGetSnapshot();
        if (state === "roundWait") {
          guard(() => console.warn("[next] stuck in cooldown"));
        }
        cooldownWarningTimeoutId = null;
      }, 1000);
    }
    await Promise.resolve();
  } catch (error) {
    timerLogger.error("[next] error during click handling", error);
  } finally {
    nextClickInFlight = false;
    try {
      // Use unified selection state API (store.selectionMade is source of truth)
      resetSelectionFinalized(activeStore);
    } catch {}
  }
}

// `getNextRoundControls` comes from `roundManager.js` and returns the active
// controls for the Next-round cooldown (timer, resolveReady, ready).

/**
 * Resolve the round timer duration and provide a restore callback for temporary UI.
 *
 * @param {{showTemporaryMessage?: (msg: string) => () => void}} [scoreboardApi=scoreboard]
 * - Scoreboard facade used to surface syncing state.
 * @returns {Promise<{duration: number, synced: boolean, restore: () => void}>}
 * @summary Resolve round timer duration with scoreboard fallbacks.
 * @pseudocode
 * 1. Default duration to 30 seconds and attempt to read the configured value.
 * 2. Check test override hook first (window.__OVERRIDE_TIMERS) for test-friendliness.
 * 3. If no override, read the configured default timer value.
 * 4. If the value is unavailable, mark the timer as unsynced and show "Waiting…".
 * 5. Return the resolved duration, synced flag, and a restore callback.
 */
export async function resolveRoundTimerDuration({ showTemporaryMessage } = scoreboard) {
  let duration = 30;
  let synced = true;

  try {
    let val;

    // Check test override hook first (allows tests to inject timer values directly)
    try {
      const w = typeof window !== "undefined" ? window : globalThis;
      const overrides = w && w.__OVERRIDE_TIMERS;
      if (overrides && Object.prototype.hasOwnProperty.call(overrides, "roundTimer")) {
        const v = overrides["roundTimer"];
        if (typeof v === "number") {
          val = v;
        }
      }
    } catch {}

    // If no test override, read the configured default timer
    if (typeof val !== "number") {
      val = getDefaultTimer("roundTimer");
    }

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
      const result = showTemporaryMessage(t("ui.waiting"));
      if (typeof result === "function") {
        restore = result;
      }
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
 */
export function primeTimerDisplay({
  duration,
  scoreboardApi = scoreboard,
  root = typeof document !== "undefined" ? document : null
} = {}) {
  if (!Number.isFinite(duration)) return;

  try {
    emitBattleEvent("display.timer.tick", { secondsRemaining: duration });
  } catch {}

  void root;
  void scoreboardApi;
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
    // Timer ticks are display-only; they must not trigger state transitions.
    try {
      emitEvent?.("display.timer.tick", { secondsRemaining: Number(remaining) || 0 });
    } catch {}
  };

  try {
    timer?.on?.("tick", tickHandler);
  } catch {}

  timer?.on?.("tick", (remaining) => {
    try {
      const remainingSeconds = Math.max(0, Number(remaining) || 0);
      emitEvent?.("round.timer.tick", { remainingMs: remainingSeconds * 1000 });
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
    const isVitest = typeof process !== "undefined" && process.env && process.env.VITEST;
    if (isVitest) {
      try {
        console.warn(`[test] onExpired: selectionMade=${alreadyPicked}`);
      } catch {}
    }

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
    startRound = engineStartRound,
    resolveDuration = resolveRoundTimerDuration
  } = dependencies;

  const { duration, synced, restore } = await resolveDuration(scoreboardApi);

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

  const documentRef = root;
  let visibilityHandler = null;
  let removeExpiredCleanup = null;
  let cleanupExecuted = false;

  if (documentRef && typeof documentRef.addEventListener === "function") {
    visibilityHandler = () => {
      if (documentRef?.hidden) {
        timer.pause();
      } else {
        timer.resume();
      }
    };

    documentRef.addEventListener("visibilitychange", visibilityHandler);
  }

  // Return a cleanup function or store the handler for later removal
  const cleanup = () => {
    const unsubscribeExpired = removeExpiredCleanup;
    removeExpiredCleanup = null;

    if (cleanupExecuted) {
      return;
    }
    cleanupExecuted = true;

    if (typeof unsubscribeExpired === "function") {
      try {
        unsubscribeExpired();
      } catch {}
    }

    const handler = visibilityHandler;
    visibilityHandler = null;

    if (handler && documentRef && typeof documentRef.removeEventListener === "function") {
      try {
        documentRef.removeEventListener("visibilitychange", handler);
      } catch {}
    }
  };

  const handleExpired = () => {
    if (cleanupExecuted) {
      return;
    }
    cleanup();
  };

  removeExpiredCleanup =
    typeof timer?.on === "function" ? timer.on("expired", handleExpired) : null;

  if (typeof timer?.stop === "function") {
    const originalStop = timer.stop.bind(timer);
    timer.stop = () => {
      try {
        cleanup();
      } catch (error) {
        if (process?.env?.NODE_ENV !== "test") {
          console.warn("Timer cleanup failed:", error);
        }
      }
      return originalStop();
    };
  }

  try {
    setSkip?.(() => {
      cleanup();
      timer.stop();
    });
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
