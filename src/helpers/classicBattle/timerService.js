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
import { dispatchBattleEvent } from "./orchestrator.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { getStateSnapshot } from "./battleDebug.js";
import { getNextRoundControls } from "./roundManager.js";
import { guard } from "./guard.js";

export { getNextRoundControls } from "./roundManager.js";

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
  try {
    const { state } = getStateSnapshot();
    if (state === "cooldown" || !state) {
      setSkipHandler(null);
      await dispatchBattleEvent("ready");
      if (typeof resolveReady === "function") resolveReady();
    }
  } catch {}
}

/**
 * Click handler for the Next button.
 *
 * Delegates to `advanceWhenReady` when the button is marked ready or to
 * `cancelTimerOrAdvance` to stop an active timer / advance when in cooldown.
 *
 * @pseudocode
 * 1. Read `controls` (timer and resolveReady) from `getNextRoundControls()` when not supplied.
 * 2. If the Next button element has `data-next-ready="true"`, call `advanceWhenReady`.
 * 3. Otherwise call `cancelTimerOrAdvance` to either stop an active timer or dispatch `ready`.
 *
 * @param {MouseEvent} _evt - Click event.
 * @param {{timer: {stop: () => void} | null, resolveReady: (() => void) | null}} [controls=getNextRoundControls()]
 * - Timer controls returned from `startCooldown`.
 * @returns {Promise<void>}
 */
export async function onNextButtonClick(_evt, controls = getNextRoundControls()) {
  const { timer = null, resolveReady = null } = controls || {};
  const btn = document.getElementById("next-button");
  if (!btn) return;
  if (btn.dataset.nextReady === "true") {
    await advanceWhenReady(btn, resolveReady);
  } else {
    await cancelTimerOrAdvance(btn, timer, resolveReady);
  }
  realScheduler.setTimeout(() => {
    try {
      const { state } = getStateSnapshot();
      if (state === "cooldown") {
        guard(() => console.warn("[next] stuck in cooldown"));
      }
    } catch {}
  }, 1000);
}

// `getNextRoundControls` is re-exported from `roundManager.js` and returns
// the active controls for the Next-round cooldown (timer, resolveReady, ready).

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
    // Nudge the stalled prompt slightly after the stall timeout so
    // callers advancing exactly `timeoutMs` won't observe a new snackbar
    // replacing the initial "Select your move" prompt immediately.
    scheduler.setTimeout(() => {
      try {
        showSnackbar(stalledMsg);
      } catch {}
      if (!isEnabled("autoSelect")) {
        try {
          scoreboard.showMessage(stalledMsg);
        } catch {}
      }
      try {
        emitBattleEvent("statSelectionStalled");
      } catch {}
    }, 100);
    if (isEnabled("autoSelect")) {
      // Surface the upcoming countdown shortly after the stall prompt so
      // observers can first see the stalled message, then the countdown.
      try {
        const secs = computeNextRoundCooldown();
        scheduler.setTimeout(() => {
          try {
            showSnackbar(t("ui.nextRoundIn", { seconds: secs }));
          } catch {}
        }, 800);
      } catch {}
      try {
        scheduler.setTimeout(() => {
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
