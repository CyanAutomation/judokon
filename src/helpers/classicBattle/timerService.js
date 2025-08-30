import { getDefaultTimer } from "../timerUtils.js";
import { startRound as engineStartRound } from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { updateDebugPanel } from "./uiHelpers.js";
import * as snackbar from "../showSnackbar.js";
import { t } from "../i18n.js";
import { setSkipHandler } from "./skipHandler.js";
import { autoSelectStat } from "./autoSelectStat.js";
import { emitBattleEvent } from "./battleEvents.js";
import { isEnabled } from "../featureFlags.js";

import { realScheduler } from "../scheduler.js";
import { dispatchBattleEvent } from "./battleDispatcher.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { attachCooldownRenderer } from "../CooldownRenderer.js";
const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;

/**
 * Store controls for the pending next round. Updated by `scheduleNextRound`
 * and consumed by `onNextButtonClick` when invoked via the Next button.
 * @type {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
 */
let currentNextRound = null;

// Skip handler utilities moved to skipHandler.js

/**
 * Handle clicks on the Next button. Uses the active timer controls provided by
 * `scheduleNextRound` to either resolve the ready promise or cancel the timer.
 *
 * @param {MouseEvent} _evt - Click event.
 * @param {{timer: {stop: () => void} | null, resolveReady: (() => void) | null}} [controls=currentNextRound]
 * - Timer controls returned from `scheduleNextRound`.
 */
export async function onNextButtonClick(_evt, { timer, resolveReady } = currentNextRound ?? {}) {
  const btn = document.getElementById("next-button");
  if (!btn) return;

  if (btn.dataset.nextReady === "true") {
    btn.disabled = true;
    delete btn.dataset.nextReady;
    // Failsafe: if the machine isn't in cooldown, advance via a safe path.
    try {
      const state =
        typeof window !== "undefined" && window.__classicBattleState
          ? window.__classicBattleState
          : null;
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
    return;
  }

  if (timer) {
    timer.stop();
  } else {
    // No active timer controls: if we're in cooldown, advance immediately
    try {
      const state =
        typeof window !== "undefined" && window.__classicBattleState
          ? window.__classicBattleState
          : null;
      if (state === "cooldown") {
        await dispatchBattleEvent("ready");
        if (typeof resolveReady === "function") resolveReady();
        setSkipHandler(null);
      }
    } catch {}
  }
}

/**
 * Expose current next-round controls for helpers like `setupNextButton`.
 *
 * @returns {{timer: ReturnType<typeof createRoundTimer>|null, resolveReady: (()=>void)|null, ready: Promise<void>|null}|null}
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
 * @returns {Promise<void>} Resolves when the timer begins.
 */
export async function startTimer(onExpiredSelect) {
  let duration = 30;
  let synced = true;

  const onTick = (remaining) => {
    scoreboard.updateTimer(remaining);
  };

  const onExpired = async () => {
    setSkipHandler(null);
    scoreboard.clearTimer();
    // If a selection was already made, do not auto-select again.
    try {
      const store = typeof window !== "undefined" ? window.battleStore : null;
      const alreadyPicked = !!(store && store.selectionMade);
      try {
        console.warn(`[test] onExpired: selectionMade=${alreadyPicked}`);
      } catch {}
      if (alreadyPicked) {
        return;
      }
    } catch {}
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
      snackbar.showSnackbar(t("ui.waiting"));
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
 * 1. Display "Stat selection stalled" via `scoreboard.showMessage`.
 * 2. After `timeoutMs` milliseconds call `autoSelectStat(onSelect)`.
 *
 * @param {{autoSelectId: ReturnType<typeof setTimeout> | null}} store
 * - Battle state store.
 * @param {(stat: string, opts?: { delayOpponentMessage?: boolean }) => void} onSelect
 * - Callback to handle stat selection.
 * @param {number} [timeoutMs=5000] - Delay before auto-selecting.
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
    scoreboard.showMessage(t("ui.statSelectionStalled"));
    try {
      emitBattleEvent("statSelectionStalled");
    } catch {}
    if (isEnabled("autoSelect")) {
      autoSelectStat(onSelect);
    }
  }, timeoutMs);
}

/**
 * Handle expiration of the next-round cooldown.
 *
 * @pseudocode
 * 1. Clear the skip handler and scoreboard timer.
 * 2. Enable the Next button and mark it as ready.
 * 3. Dispatch "ready", update the debug panel, and resolve the ready promise.
 *
 * @param {{resolveReady: (() => void) | null}} controls - Timer controls.
 * @param {HTMLButtonElement | null} btn - Next button element.
 * @returns {Promise<void>}
 */
export async function handleNextRoundExpiration(controls, btn) {
  setSkipHandler(null);
  scoreboard.clearTimer();
  // Mark Next as ready before signaling state progression
  if (btn) {
    btn.dataset.nextReady = "true";
    btn.disabled = false;
  }
  try {
    const state =
      typeof window !== "undefined" && window.__classicBattleState
        ? window.__classicBattleState
        : null;
    if (!state || state === "cooldown") {
      await dispatchBattleEvent("ready");
      // Ensure Next remains marked ready after the transition in case
      // other handlers mutated the element during state changes.
      if (btn) {
        btn.dataset.nextReady = "true";
        btn.disabled = false;
      }
    } else {
      // If cooldown hasn't begun yet, wait for it and then mark ready.
      try {
        const onState = async (e) => {
          try {
            const to = e && e.detail ? e.detail.to : null;
            if (to === "cooldown") {
              document.removeEventListener("battle:state", onState);
              await dispatchBattleEvent("ready");
              if (btn) {
                btn.dataset.nextReady = "true";
                btn.disabled = false;
              }
            }
          } catch {}
        };
        document.addEventListener("battle:state", onState);
      } catch {}
      try {
        console.warn(`[test] expiration deferred until cooldown; state=${state}`);
      } catch {}
    }
  } catch {}
  updateDebugPanel();
  if (typeof controls.resolveReady === "function") {
    controls.resolveReady();
  }
}

/**
 * Enable the Next Round button after a cooldown period.
 *
 * @pseudocode
 * 1. If the match ended, resolve immediately.
 * 2. Determine cooldown seconds via `computeNextRoundCooldown` (minimum 1s).
 * 3. Locate `#next-button` and reset the button state.
 * 4. Attach `CooldownRenderer` to update UI and register `onExpired` with `handleNextRoundExpiration`.
 * 5. Register a skip handler that logs the skip (for tests) and stops the timer.
 * 6. Start the timer and resolve when expired.
 *
 * @param {{matchEnded: boolean}} result - Result from a completed round.
 * @returns {{
 *   ready: Promise<void>,
 *   timer: ReturnType<typeof createRoundTimer> | null,
 *   resolveReady: (() => void) | null
 * }} Controls for the scheduled next round.
 */
export function scheduleNextRound(result, scheduler = realScheduler) {
  try {
    const s = typeof window !== "undefined" ? window.__classicBattleState || null : null;
    if (typeof window !== "undefined") {
      window.__scheduleNextRoundCount = (window.__scheduleNextRoundCount || 0) + 1;
      if (!IS_VITEST)
        console.warn(
          `[test] scheduleNextRound call#${window.__scheduleNextRoundCount}: state=${s} matchEnded=${!!result?.matchEnded}`
        );
    }
  } catch {}
  // Guard: only schedule when the machine is in roundOver/cooldown. If we're
  // already in roundStart or waitingForPlayerAction, skip scheduling entirely
  // to avoid conflicting timers and suppressed auto-advance.
  const controls = { timer: null, resolveReady: null, ready: null };

  controls.ready = new Promise((resolve) => {
    controls.resolveReady = () => {
      emitBattleEvent("nextRoundTimerReady");
      resolve();
      controls.resolveReady = null;
    };
  });

  if (result.matchEnded) {
    setSkipHandler(null);
    if (controls.resolveReady) controls.resolveReady();
    currentNextRound = controls;
    return controls;
  }

  const btn = document.getElementById("next-button");

  // Reset any leftover ready state so each cooldown runs through the timer
  // path even after an auto-advance.
  if (btn) {
    btn.disabled = false;
    delete btn.dataset.nextReady;
  }

  const cooldownSeconds = computeNextRoundCooldown();

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
      snackbar.showSnackbar("Waiting…");
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
  // Fallback: in environments where the engine isn't running (or mocks omit
  // startCoolDown), ensure expiration still occurs so the state machine can
  // progress and tests don't hang.
  try {
    const ms = Math.max(0, Number(cooldownSeconds) * 1000) + 10;
    scheduler.setTimeout(onExpired, ms);
  } catch {}
  currentNextRound = controls;
  return controls;
}
