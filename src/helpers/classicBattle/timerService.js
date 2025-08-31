import { getDefaultTimer } from "../timerUtils.js";
import { startRound as engineStartRound } from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { showSnackbar } from "../showSnackbar.js";
import { t } from "../i18n.js";
import { setSkipHandler } from "./skipHandler.js";
import { autoSelectStat } from "./autoSelectStat.js";
import { emitBattleEvent } from "./battleEvents.js";
import { isEnabled } from "../featureFlags.js";

import { realScheduler } from "../scheduler.js";
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { attachCooldownRenderer } from "../CooldownRenderer.js";
import { awaitCooldownState } from "./awaitCooldownState.js";
import { getStateSnapshot } from "./battleDebug.js";
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;
import { exposeDebugState, readDebugState } from "./debugHooks.js";

/**
 * Store controls for the pending next round. Updated by `scheduleNextRound`
 * and consumed by `onNextButtonClick` when invoked via the Next button.
 * @type {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
 */
let currentNextRound = null;

/**
 * Schedule a fallback timeout and return its id.
 *
 * @pseudocode
 * 1. Attempt to call `setTimeout(cb, ms)`.
 * 2. Return the timer id or `null` on failure.
 *
 * @param {number} ms
 * @param {Function} cb
 * @returns {ReturnType<typeof setTimeout>|null}
 */
export function setupFallbackTimer(ms, cb) {
  try {
    return setTimeout(cb, ms);
  } catch {
    return null;
  }
}

/**
 * Mark the Next button as ready and enable it.
 *
 * @pseudocode
 * 1. If `btn` exists:
 * 2.   - Set `data-next-ready` to "true".
 * 3.   - Enable the button.
 *
 * @param {HTMLButtonElement | null} btn - Next button element.
 */
export function markNextReady(btn) {
  if (btn) {
    btn.dataset.nextReady = "true";
    btn.disabled = false;
  }
}

// Skip handler utilities moved to skipHandler.js

/**
 * Disable the Next button and dispatch "ready" if it was already marked ready.
 *
 * @pseudocode
 * 1. Disable the button and clear `data-next-ready`.
 * 2. If state isn't cooldown, interrupt to reach cooldown.
 * 3. Dispatch "ready", resolve the promise, and clear skip handler.
 *
 * @param {HTMLButtonElement} btn - Next button element.
 * @param {(() => void)|null} resolveReady - Resolver for the ready promise.
 * @example
 * await advanceWhenReady(btn, resolve);
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
export async function advanceWhenReady(btn, resolveReady) {
  btn.disabled = true;
  delete btn.dataset.nextReady;
  // Failsafe: if the machine isn't in cooldown, advance via a safe path.
  try {
    const { state } = getStateSnapshot();
    if (state && state !== "cooldown") {
      // If we're still in roundDecision or waitingForPlayerAction due to a race,
      // interrupt the round to reach cooldown, then mark ready.
      if (state === "roundDecision" || state === "waitingForPlayerAction") {
        try {
          await dispatchBattleEvent("interrupt", { reason: "advanceNextFromNonCooldown" });
        } catch {}
      }
    }
  } catch {}
  await dispatchBattleEvent("ready");
  if (typeof resolveReady === "function") {
    resolveReady();
  }
  setSkipHandler(null);
}

/**
 * Cancel an active timer or immediately advance when already in cooldown.
 *
 * @pseudocode
 * 1. If timer exists, stop it and return.
 * 2. Otherwise, dispatch "ready" when state is cooldown.
 *
 * @param {HTMLButtonElement} _btn - Next button element.
 * @param {{stop: () => void}|null} timer - Active cooldown timer.
 * @param {(() => void)|null} resolveReady - Resolver for the ready promise.
 * @example
 * await cancelTimerOrAdvance(btn, timer, resolve);
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
export async function cancelTimerOrAdvance(_btn, timer, resolveReady) {
  if (timer) {
    timer.stop();
    return;
  }
  // No active timer controls: if we're in cooldown (or state is unknown in
  // this module instance during tests), advance immediately.
  try {
    const { state } = getStateSnapshot();
    if (state === "cooldown" || !state) {
      await dispatchBattleEvent("ready");
      if (typeof resolveReady === "function") resolveReady();
      setSkipHandler(null);
    }
  } catch {}
}

/**
 * Handle clicks on the Next button by delegating to helper functions.
 *
 * @param {MouseEvent} _evt - Click event.
 * @param {{timer: {stop: () => void} | null, resolveReady: (() => void) | null}} [controls=currentNextRound]
 * - Timer controls returned from `scheduleNextRound`.
 * @example
 * const controls = { timer, resolveReady };
 * await onNextButtonClick(new MouseEvent("click"), controls);
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
export async function onNextButtonClick(_evt, { timer, resolveReady } = currentNextRound ?? {}) {
  const btn = document.getElementById("next-button");
  if (!btn) return;
  if (btn.dataset.nextReady === "true") {
    await advanceWhenReady(btn, resolveReady);
    return;
  }
  await cancelTimerOrAdvance(btn, timer, resolveReady);
}

/**
 * Expose current next-round controls for helpers like `setupNextButton`.
 *
 * @returns {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
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
export function getNextRoundControls() {
  return currentNextRound;
}

/**
 * Helper to force auto-select and dispatch outcome on timer error or drift.
 *
 * @pseudocode
 * 1. Show error message via scoreboard.
 * 2. Call autoSelectStat with the provided callback.
 * 3. Ensure the outcome event is dispatched so the state machine progresses.
 *
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => Promise<void>} onExpiredSelect
 * - Callback to handle stat auto-selection.
 * @returns {Promise<void>}
 */
async function forceAutoSelectAndDispatch(onExpiredSelect) {
  scoreboard.showMessage(t("ui.timerErrorAutoSelect"));
  try {
    if (isEnabled("autoSelect")) {
      await autoSelectStat(onExpiredSelect);
    } else {
      await dispatchBattleEvent("interrupt");
    }
  } catch {
    // If auto-select fails, dispatch interrupt to avoid stalling
    await dispatchBattleEvent("interrupt");
  }
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
 * @returns {Promise<void>} Resolves when the timer begins.
 */
export async function startTimer(onExpiredSelect, store = null) {
  let duration = 30;
  let synced = true;

  const onTick = (remaining) => {
    scoreboard.updateTimer(remaining);
  };

  const onExpired = async () => {
    setSkipHandler(null);
    scoreboard.clearTimer();
    // If a selection was already made, do not auto-select again.
    const alreadyPicked = !!(store && store.selectionMade);
    try {
      console.warn(`[test] onExpired: selectionMade=${alreadyPicked}`);
    } catch {}
    if (alreadyPicked) {
      return;
    }
    try {
      emitBattleEvent("roundTimeout");
    } catch {}
    // Important: don't block auto-select behind the state transition.
    // The roundDecision onEnter waits for a short window for playerChoice;
    // if we await the dispatch first, the guard can interrupt before
    // autoSelect runs. Start auto-select immediately and then await the
    // timeout dispatch so both proceed concurrently. Even when auto-select
    // is disabled, the timeout event must still be dispatched so the state
    // machine can interrupt the round.
    const selecting = isEnabled("autoSelect")
      ? (async () => {
          try {
            await autoSelectStat(onExpiredSelect);
          } catch {}
        })()
      : Promise.resolve();
    await dispatchBattleEvent("timeout");
    await selecting;
  };

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
  const restore = !synced ? scoreboard.showTemporaryMessage(t("ui.waiting")) : () => {};

  const timer = createRoundTimer({
    starter: engineStartRound,
    onDriftFail: () => forceAutoSelectAndDispatch(onExpiredSelect)
  });
  timer.on("tick", onTick);
  timer.on("expired", onExpired);
  timer.on("drift", () => {
    const msgEl = document.getElementById("round-message");
    if (msgEl && msgEl.textContent) {
      showSnackbar(t("ui.waiting"));
    } else {
      scoreboard.showMessage(t("ui.waiting"));
    }
  });

  setSkipHandler(() => timer.stop());

  timer.start(duration);
  restore();
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
export function handleStatSelectionTimeout(
  store,
  onSelect,
  timeoutMs = 5000,
  scheduler = realScheduler
) {
  store.autoSelectId = scheduler.setTimeout(() => {
    // If a selection was made in the meantime, do nothing.
    if (store && store.selectionMade) return;
    const stalledMsg = t("ui.statSelectionStalled");
    showSnackbar(stalledMsg);
    if (!isEnabled("autoSelect")) {
      scoreboard.showMessage(stalledMsg);
    }
    try {
      emitBattleEvent("statSelectionStalled");
    } catch {}
    if (isEnabled("autoSelect")) {
      try {
        setTimeout(() => {
          try {
            autoSelectStat(onSelect);
          } catch {}
        }, 250);
      } catch {
        autoSelectStat(onSelect);
      }
    }
  }, timeoutMs);
}

/**
 * Handle expiration of the next-round cooldown.
 *
 * @pseudocode
 * 1. Clear the skip handler and scoreboard timer.
 * 2. Enable the Next button and mark it as ready.
 * 3. Wait for the battle state to reach "cooldown".
 * 4. Dispatch "ready" and wait for handlers to complete.
 * 5. Mark the button as ready again, update the debug panel, and resolve the ready promise.
 *
 * @param {{resolveReady: (() => void) | null}} controls - Timer controls.
 * @param {HTMLButtonElement | null} btn - Next button element.
 * @returns {Promise<void>}
 */
export async function handleNextRoundExpiration(controls, btn) {
  setSkipHandler(null);
  scoreboard.clearTimer();
  markNextReady(btn);
  await awaitCooldownState();
  try {
    try {
      const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;
      if (!IS_VITEST) {
        console.log("DEBUG: handleNextRoundExpiration dispatching 'ready'");
      }
    } catch {}
    await dispatchBattleEvent("ready");
  } catch {}
  markNextReady(btn);
  try {
    const { updateDebugPanel } = await import("./uiHelpers.js");
    updateDebugPanel();
  } catch {}
  if (typeof controls.resolveReady === "function") {
    controls.resolveReady();
  }
}

/**
 * Create an expiration handler for the next-round cooldown timer.
 *
 * @pseudocode
 * 1. Ignore subsequent calls after the first invocation.
 * 2. Delegate to `handleNextRoundExpiration(controls, btn)`.
 *
 * @param {{resolveReady: (() => void) | null}} controls - Timer controls.
 * @param {HTMLButtonElement | null} btn - Next button element.
 * @returns {() => Promise<void>} Expiration handler.
 */
function createNextRoundOnExpired(controls, btn) {
  let expired = false;
  return () => {
    if (expired) return;
    expired = true;
    return handleNextRoundExpiration(controls, btn);
  };
}

/**
 * Prepare and return the cooldown timer for the next round.
 *
 * @pseudocode
 * 1. Create a round timer and attach `CooldownRenderer`.
 * 2. Register the provided expiration handler.
 * 3. Forward drift events to a fallback message.
 * 4. Register a skip handler that stops the timer.
 *
 * @param {{timer: ReturnType<typeof createRoundTimer>|null}} controls - Timer controls.
 * @param {HTMLButtonElement | null} btn - Next button element.
 * @param {number} cooldownSeconds - Cooldown duration in seconds.
 * @param {() => Promise<void>} onExpired - Expiration handler.
 * @returns {ReturnType<typeof createRoundTimer>} Prepared timer instance.
 */
function prepareNextRoundTimer(controls, btn, cooldownSeconds, onExpired) {
  const timer = createRoundTimer();
  attachCooldownRenderer(timer, cooldownSeconds);
  timer.on("expired", onExpired);
  timer.on("drift", () => {
    const msgEl = document.getElementById("round-message");
    if (msgEl && msgEl.textContent) {
      showSnackbar("Waiting…");
    } else {
      scoreboard.showMessage("Waiting…");
    }
  });
  controls.timer = timer;
  setSkipHandler(() => {
    try {
      console.warn("[test] skip: stop nextRoundTimer");
    } catch {}
    controls.timer?.stop();
  });
  return timer;
}

/**
 * Enable the Next Round button after a cooldown period.
 *
 * @pseudocode
 * 1. If the match ended, resolve immediately.
 * 2. Determine cooldown seconds via `computeNextRoundCooldown` (minimum 1s).
 * 3. Locate `#next-button` and reset the button state.
 * 4. Attach `CooldownRenderer` and wire expiration callbacks via helpers.
 * 5. Register a skip handler that logs the skip (for tests) and stops the timer.
 * 6. Start the timer and schedule a fallback with `setupFallbackTimer`.
 *
 * @param {{matchEnded: boolean}} result - Result from a completed round.
 * @returns {{
 *   ready: Promise<void>,
 *   timer: ReturnType<typeof createRoundTimer> | null,
 *   resolveReady: (() => void) | null
 * }} Controls for the scheduled next round.
 */
export function scheduleNextRound(result, scheduler = realScheduler) {
  logScheduleNextRound(result);
  const controls = createNextRoundControls();
  if (result.matchEnded) {
    setSkipHandler(null);
    if (controls.resolveReady) controls.resolveReady();
    currentNextRound = controls;
    return controls;
  }
  const btn = document.getElementById("next-button");
  if (btn) {
    btn.disabled = false;
    delete btn.dataset.nextReady;
  }
  const cooldownSeconds = computeNextRoundCooldown();
  wireNextRoundTimer(controls, btn, cooldownSeconds, scheduler);
  currentNextRound = controls;
  return controls;
}

function logScheduleNextRound(result) {
  try {
    const { state: s } = getStateSnapshot();
    const count = (readDebugState("scheduleNextRoundCount") || 0) + 1;
    exposeDebugState("scheduleNextRoundCount", count);
    if (!IS_VITEST)
      console.warn(
        `[test] scheduleNextRound call#${count}: state=${s} matchEnded=${!!result?.matchEnded}`
      );
  } catch {}
}

function createNextRoundControls() {
  const controls = { timer: null, resolveReady: null, ready: null };
  controls.ready = new Promise((resolve) => {
    controls.resolveReady = () => {
      emitBattleEvent("nextRoundTimerReady");
      resolve();
      controls.resolveReady = null;
    };
  });
  return controls;
}

function wireNextRoundTimer(controls, btn, cooldownSeconds, scheduler) {
  // Do not skip scheduling based on current state; roundResolved may fire
  // while the machine is still transitioning. Scheduling early is safe — the
  // expiration handler checks the live state before dispatching 'ready'.
  const timer = createRoundTimer();
  attachCooldownRenderer(timer, cooldownSeconds);
  let expired = false;
  const onExpired = () => {
    if (expired) return;
    expired = true;
    return handleNextRoundExpiration(controls, btn);
  };
  timer.on("expired", onExpired);
  timer.on("drift", () => {
    const msgEl = document.getElementById("round-message");
    if (msgEl && msgEl.textContent) {
      showSnackbar("Waiting…");
    } else {
      scoreboard.showMessage("Waiting…");
    }
  });
  controls.timer = timer;
  setSkipHandler(() => {
    try {
      console.warn("[test] skip: stop nextRoundTimer");
    } catch {}
    controls.timer?.stop();
  });

  // Start engine-backed countdown on the next tick.
  scheduler.setTimeout(() => controls.timer.start(cooldownSeconds), 0);
  // Fallback to ensure expiration when the engine isn't running.
  try {
    const ms = Math.max(0, Number(cooldownSeconds) * 1000) + 10;
    setupFallbackTimer(ms, onExpired);
  } catch {}
}
