import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { guard, guardAsync } from "./guard.js";
import { setSkipHandler } from "./skipHandler.js";
import {
  hasReadyBeenDispatchedForCurrentCooldown,
  resetReadyDispatchState,
  setReadyDispatchedForCurrentCooldown
} from "./roundReadyState.js";

/**
 * Turn-based wait: enable the "Next Round" button and wait indefinitely for
 * the player to click it. No timer fires automatically.
 *
 * When the player clicks the button, `onNextButtonClick` fires which emits
 * `skipCooldown`. This listener picks that up and dispatches `ready` to the
 * state machine exactly once.
 *
 * @param {object} machine State machine instance.
 * @returns {void}
 * @pseudocode
 * 1. Find and enable the "Next Round" button.
 * 2. Emit `nextRoundTimerReady` so UI listeners know the button is active.
 * 3. Register a one-shot `skipCooldown` listener that calls machine.dispatch("ready").
 */
export function initTurnBasedWait(machine) {
  // Enable the "Next Round" button immediately
  const btn = getNextButton();
  if (btn) {
    try {
      btn.disabled = false;
    } catch {}
    try {
      if (btn.dataset) btn.dataset.nextReady = "true";
      btn.setAttribute("data-next-ready", "true");
    } catch {}
  }

  guard(() => emitBattleEvent("nextRoundTimerReady"));

  // One-shot dispatch guard
  let dispatched = false;
  const dispatch = () => {
    if (dispatched) return;
    dispatched = true;
    offBattleEvent("skipCooldown", dispatch);
    guardAsync(() => machine.dispatch("ready"));
  };

  // Listen for skipCooldown, which is emitted by onNextButtonClick
  onBattleEvent("skipCooldown", dispatch);
}

/**
 * Initialize the match start wait — turn-based: no timer fires automatically.
 *
 * The game now waits indefinitely for the player to click "Next Round".
 * Delegates to `initTurnBasedWait()`.
 *
 * @param {object} machine State machine instance.
 * @returns {void}
 * @pseudocode
 * 1. Enable the "Next Round" button.
 * 2. Register a skip handler so a button click dispatches `ready`.
 * 3. No timer is started.
 */
export function initStartCooldown(machine) {
  initTurnBasedWait(machine);
}

/**
 * @summary Resolve the inter-round cooldown duration from the compute helper.
 *
 * @pseudocode
 * 1. When `compute` is not a function → return `0`.
 * 2. Invoke `compute()` and coerce to a number.
 * 3. If the result is non-finite or negative → return `0`.
 * 4. Otherwise return the numeric duration.
 *
 * @param {() => number} [compute]
 * @returns {number}
 */
/**
 * Resolve the inter-round cooldown duration from a computation function.
 *
 * @param {() => number} compute - Function that computes the cooldown duration.
 * @summary Safely compute and validate inter-round cooldown duration.
 * @pseudocode
 * 1. Check if compute is a valid function.
 * 2. Execute the computation and convert to number.
 * 3. Validate the result is a finite, non-negative number.
 * 4. Return 0 for invalid results.
 *
 * @returns {number} The cooldown duration in seconds, or 0 if invalid.
 */
export function resolveInterRoundCooldownDuration(compute) {
  if (typeof compute !== "function") return 0;
  try {
    const value = Number(compute());
    if (!Number.isFinite(value) || value < 0) return 0;
    return value;
  } catch {
    return 0;
  }
}

/**
 * Locate the Next button element used for advancing rounds.
 *
 * @returns {HTMLButtonElement|null}
 */
function getNextButton() {
  if (typeof document === "undefined") return null;
  return /** @type {HTMLButtonElement|null} */ (
    document.getElementById("next-button") || document.querySelector('[data-role="next-round"]')
  );
}

/**
 * @summary Mark the provided Next button as ready for the next round.
 *
 * @pseudocode
 * 1. Ignore falsy button references.
 * 2. Clear the `disabled` state.
 * 3. Set both property and attribute to `data-next-ready="true"`.
 * 4. Remove the `disabled` attribute for defensive DOM shims.
 *
 * @param {HTMLButtonElement|null|undefined} btn
 * @returns {void}
 */
export function markNextButtonReady(btn) {
  if (!btn) return;
  btn.disabled = false;
  if (btn.dataset) btn.dataset.nextReady = "true";
  btn.setAttribute("data-next-ready", "true");
}

/**
 * @summary Enable the Next button during cooldown and ensure readiness persists.
 *
 * @pseudocode
 * 1. Locate the Next button.
 * 2. Mark it ready immediately via `markNextButtonReady`.
 * 3. Schedule a microtask/timeout using the provided scheduler to reapply readiness
 *    if the button was toggled while the machine remains in `cooldown`.
 * 4. Emit `nextRoundTimerReady` regardless of button presence.
 * 5. Return the button reference (or `null` when absent).
 *
 * @param {object} machine State machine instance.
 * @param {{setTimeout?: typeof setTimeout}} [scheduler]
 * @returns {HTMLButtonElement|null}
 */
export function prepareNextButtonForCooldown(machine, scheduler) {
  const button = getNextButton();
  if (button) {
    guard(() => markNextButtonReady(button));
    const schedule =
      scheduler && typeof scheduler.setTimeout === "function" ? scheduler.setTimeout : setTimeout;
    const reapply = () => {
      const nextBtn = getNextButton();
      if (!nextBtn) return;
      let state = null;
      try {
        state = machine?.getState?.();
      } catch {}
      if (state && state !== "roundWait") return;
      if (nextBtn.dataset?.nextReady === "true") return;
      guard(() => markNextButtonReady(nextBtn));
    };
    try {
      schedule(() => reapply(), 0);
    } catch {
      try {
        setTimeout(() => reapply(), 0);
      } catch {}
    }
  }
  guard(() => emitBattleEvent("nextRoundTimerReady"));
  return button;
}

/**
 * @summary Configure the round timer for the inter-round cooldown lifecycle.
 *
 * @pseudocode
 * 1. Register `onExpired` and `onTick` handlers when provided.
 * 2. Set the global skip handler to mirror the expiration callback.
 * 3. Start the timer for the supplied duration.
 *
 * @param {object} options
 * @param {{ on: Function, start: Function }} options.timer
 * @param {number} options.duration Seconds to run the timer.
 * @param {(remaining: number) => void} options.onTick
 * @param {() => void} options.onExpired
 * @returns {void}
 */
export function setupInterRoundTimer({ timer, duration, onTick, onExpired }) {
  if (!timer) return;
  if (typeof onExpired === "function") {
    guard(() => timer.on("expired", onExpired));
    setSkipHandler(onExpired);
  }
  if (typeof onTick === "function") {
    guard(() => timer.on("tick", onTick));
  }
  guard(() => timer.start(duration));
}

/**
 * @summary Create a completion handler that finalizes the cooldown flow.
 *
 * @pseudocode
 * 1. Track the fallback timer id for later cancellation.
 * 2. When invoked, guard against repeated execution.
 * 3. Clear fallback timers and stop the engine timer.
 * 4. Reset the skip handler and mark the Next button ready when needed.
 * 5. Emit completion events then dispatch `machine.dispatch("ready")` asynchronously.
 *
 * @param {object} options
 * @param {object} options.machine State machine instance.
 * @param {{ stop?: () => void }} options.timer Active round timer instance.
 * @param {HTMLButtonElement|null} options.button Next button reference.
 * @param {{clearTimeout?: typeof clearTimeout}} [options.scheduler]
 * @returns {{ finish: () => void, trackFallback: (id: ReturnType<typeof setTimeout>|null|undefined) => void }}
 */
export function createCooldownCompletion({ machine, timer, button, scheduler, onCleanup }) {
  let completed = false;
  let fallbackId = null;

  const clearFallback = () => {
    if (fallbackId === null) return;
    if (scheduler && typeof scheduler.clearTimeout === "function") {
      try {
        scheduler.clearTimeout(fallbackId);
      } catch {}
    }
    try {
      clearTimeout(fallbackId);
    } catch {}
    fallbackId = null;
  };

  const finish = () => {
    if (completed) return;
    completed = true;
    clearFallback();
    if (typeof onCleanup === "function") {
      try {
        onCleanup();
      } catch {}
    }
    guard(() => timer?.stop?.());
    guard(() => setSkipHandler(null));
    const target = button || getNextButton();
    const isButtonAlreadyReady =
      !!target && target.disabled === false && target.dataset?.nextReady === "true";
    if (!isButtonAlreadyReady) {
      guard(() => markNextButtonReady(target));
    }
    const shouldDispatchReady = () => {
      const canDispatchViaMachine = typeof machine?.dispatch === "function";
      return canDispatchViaMachine && !hasReadyBeenDispatchedForCurrentCooldown();
    };
    const shouldDispatchViaMachine = shouldDispatchReady();
    if (shouldDispatchViaMachine) {
      setReadyDispatchedForCurrentCooldown(true);
    }
    for (const evt of [
      "cooldown.timer.expired",
      "nextRoundTimerReady",
      "countdownFinished",
      "control.countdown.completed"
    ]) {
      guard(() => emitBattleEvent(evt));
    }
    if (shouldDispatchViaMachine) {
      guardAsync(async () => {
        try {
          await machine.dispatch("ready");
        } catch (error) {
          setReadyDispatchedForCurrentCooldown(false);
          guard(() =>
            emitBattleEvent("cooldown.dispatch.failed", {
              error:
                error instanceof Error
                  ? error.message
                  : typeof error === "string"
                    ? error
                    : String(error)
            })
          );
          throw error;
        }
      });
    }
  };

  return {
    finish,
    trackFallback(id) {
      fallbackId = id ?? null;
    }
  };
}

/**
 * Schedule a fallback timer for cooldown completion.
 *
 * @param {object} options - Configuration options.
 * @param {number} options.duration - Duration in seconds.
 * @param {() => void} options.finish - Completion callback.
 * @param {object} [options.scheduler] - Optional scheduler with setTimeout.
 * @summary Schedule a fallback timer that fires after the main cooldown timer.
 * @pseudocode
 * 1. Convert duration to milliseconds and add buffer time.
 * 2. Use provided scheduler or fallback to setupFallbackTimer.
 * 3. Schedule the finish callback to execute after the calculated delay.
 *
 * @returns {ReturnType<typeof setTimeout>|null} The timer ID, or null if scheduling fails.
 */
function scheduleCooldownFallback({ duration, finish, scheduler }) {
  const ms = Math.max(0, Number(duration) || 0) * 1000 + FALLBACK_TIMER_BUFFER_MS;
  return setupFallbackTimer(ms, finish, scheduler);
}

function attachVisibilityPauseControls(
  timer,
  documentRef = typeof document !== "undefined" ? document : null
) {
  if (!timer || !documentRef || typeof documentRef.addEventListener !== "function") {
    return () => {};
  }

  const handler = () => {
    try {
      if (documentRef.hidden) {
        timer.pause?.();
      } else {
        timer.resume?.();
      }
    } catch {}
  };

  try {
    documentRef.addEventListener("visibilitychange", handler);
    handler();
  } catch {}

  return () => {
    try {
      documentRef.removeEventListener("visibilitychange", handler);
    } catch {}
  };
}

/**
 * @summary Orchestrate the inter-round wait — turn-based: waits for button click.
 *
 * @param {object} machine State machine instance.
 * @param {object} [_options] Ignored — kept for API compatibility.
 * @returns {void}
 * @pseudocode
 * 1. Enable the Next button and register a skipCooldown listener.
 * 2. No timer is started; player must click to advance.
 */
export function initInterRoundCooldown(machine, _options = {}) {
  initTurnBasedWait(machine);
}
