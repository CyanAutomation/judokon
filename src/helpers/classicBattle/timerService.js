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
import { dispatchBattleEvent } from "./eventDispatcher.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { getNextRoundControls } from "./roundManager.js";
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
 * Advance to the next round when the Next button is marked ready.
 *
 * This helper disables the Next button, ensures the battle state machine
 * reaches the `cooldown` state if necessary, dispatches the `ready` event,
 * and resolves the ready promise used by tests.
 *
 * @pseudocode
 * 1. Disable the Next button and clear the `data-next-ready` attribute.
 * 2. If the machine is not in `cooldown`, dispatch an `interrupt` to reach it.
 * 3. Dispatch `ready` to advance to the next round and call `resolveReady`.
 * 4. Clear any skip handler to prevent late skips affecting the new round.
 *
 * @param {HTMLButtonElement} btn - Next button element.
 * @param {(() => void)|null} resolveReady - Resolver for the ready promise.
 * @returns {Promise<void>}
 */
export async function advanceWhenReady(btn, resolveReady) {
  btn.disabled = true;
  delete btn.dataset.nextReady;
  const { state } = safeGetSnapshot();
  const t = state && state !== "cooldown" ? ADVANCE_TRANSITIONS[state] : null;
  if (t) {
    try {
      await dispatchBattleEvent(t.event, t.payload);
    } catch {}
  }
  await dispatchBattleEvent("ready");
  if (typeof resolveReady === "function") resolveReady();
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
    await dispatchBattleEvent("ready");
    if (typeof resolveReady === "function") resolveReady();
    return;
  }
  // No active timer controls: if we're in cooldown (or state is unknown in
  // this module instance during tests), advance immediately.
  const { state } = safeGetSnapshot();
  if (state === "cooldown" || !state) {
    setSkipHandler(null);
    await dispatchBattleEvent("ready");
    if (typeof resolveReady === "function") resolveReady();
  }
}

/**
 * Click handler for the Next button.
 *
 * Unconditionally skips the inter-round cooldown by emitting
 * `countdownFinished`, then delegates to `advanceWhenReady` when the button is
 * marked ready or to `cancelTimerOrAdvance` to stop an active timer / advance
 * when in cooldown.
 *
 * @pseudocode
 * 1. Call `skipRoundCooldownIfEnabled`; return early if it skips.
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
export async function onNextButtonClick(_evt, controls = getNextRoundControls()) {
  if (skipRoundCooldownIfEnabled()) return;
  // Only finish the countdown when in cooldown (or when state is unknown in
  // tests). Emitting this in other states could confuse the state machine.
  const { state: snapState } = safeGetSnapshot();
  if (!snapState || snapState === "cooldown") {
    emitBattleEvent("countdownFinished");
  }
  const { timer = null, resolveReady = null } = controls || {};
  const btn = document.getElementById("next-button");
  if (!btn) return;
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
}

// `getNextRoundControls` is re-exported from `roundManager.js` and returns
// the active controls for the Next-round cooldown (timer, resolveReady, ready).

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

  // Debug logging for timer start
  timerLogger.info("Starting selection timer", {
    initialDuration: duration,
    synced,
    hasStore: !!store,
    selectionMade: store?.selectionMade
  });

  const onTick = (remaining) => {
    scoreboard.updateTimer(remaining);
  };

  const onExpired = async () => {
    // Debug logging for timer expiry
    logTimerOperation("expired", "selectionTimer", duration, {
      store: store ? { selectionMade: store.selectionMade } : null
    });

    setSkipHandler(null);
    scoreboard.clearTimer();
    // PRD taxonomy: round timer expired
    try {
      emitBattleEvent("round.timer.expired");
    } catch {}
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
            await autoSelectStat(
              onExpiredSelect,
              typeof process !== "undefined" && process.env && process.env.VITEST ? 0 : undefined
            );
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

  // Ensure the timer UI reflects the starting value immediately so tests and
  // users see a countdown without waiting for the first tick callback.
  try {
    if (typeof duration === "number" && Number.isFinite(duration)) {
      scoreboard.updateTimer(duration);
      // Also update the DOM element directly to decouple from scoreboard init timing
      try {
        const el = document.getElementById("next-round-timer");
        if (el) el.textContent = `Time Left: ${duration}s`;
      } catch {}
    }
  } catch {}

  const timer = createRoundTimer({
    starter: engineStartRound,
    onDriftFail: () => forceAutoSelectAndDispatch(onExpiredSelect)
  });
  timer.on("tick", onTick);
  // PRD taxonomy: round timer tick
  timer.on("tick", (remaining) => {
    try {
      emitBattleEvent("round.timer.tick", {
        remainingMs: Math.max(0, Number(remaining) || 0) * 1000
      });
    } catch {}
  });
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
