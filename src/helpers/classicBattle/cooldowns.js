import { getDefaultTimer } from "../timerUtils.js";
import { setupFallbackTimer } from "./setupFallbackTimer.js";
import { isTestModeEnabled } from "../testModeUtils.js";
import { emitBattleEvent, onBattleEvent, offBattleEvent } from "./battleEvents.js";
import { guard, guardAsync } from "./guard.js";
import { setSkipHandler } from "./skipHandler.js";
import { computeNextRoundCooldown } from "../timers/computeNextRoundCooldown.js";
import { createRoundTimer } from "../timers/createRoundTimer.js";
import { startCoolDown } from "../battleEngineFacade.js";
import {
  hasReadyBeenDispatchedForCurrentCooldown,
  setReadyDispatchedForCurrentCooldown
} from "./roundReadyState.js";

/**
 * Additional buffer to ensure fallback timers fire after engine-backed timers.
 *
 * @type {number}
 */
const FALLBACK_TIMER_BUFFER_MS = 200;

/**
 * Initialize the match start cooldown timer.
 *
 * @param {object} machine State machine instance.
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Resolve `matchStartTimer` with 3s default.
 * 2. Emit countdown start events.
 * 3. On `countdownFinished` → dispatch `ready`.
 * 4. In tests → finish immediately.
 * 5. Otherwise schedule fallback timer to dispatch `ready`.
 */
export async function initStartCooldown(machine) {
  let duration = 3;
  try {
    const val = await getDefaultTimer("matchStartTimer");
    if (typeof val === "number") duration = val;
  } catch {}
  duration = Math.max(1, Number(duration));
  let fallback;
  const finish = () => {
    guard(() => offBattleEvent("countdownFinished", finish));
    guard(() => clearTimeout(fallback));
    guard(() => emitBattleEvent("control.countdown.completed"));
    guardAsync(() => machine.dispatch("ready"));
  };
  onBattleEvent("countdownFinished", finish);
  guard(() => emitBattleEvent("countdownStart", { duration }));
  guard(() => emitBattleEvent("control.countdown.started", { durationMs: duration * 1000 }));
  if (isTestModeEnabled && isTestModeEnabled()) {
    if (typeof queueMicrotask === "function") queueMicrotask(finish);
    else setTimeout(finish, 0);
    return;
  }
  const schedule = typeof setupFallbackTimer === "function" ? setupFallbackTimer : setTimeout;
  fallback = schedule(duration * 1000 + FALLBACK_TIMER_BUFFER_MS, finish);
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
      if (state && state !== "cooldown") return;
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
export function createCooldownCompletion({ machine, timer, button, scheduler }) {
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
    guard(() => timer?.stop?.());
    guard(() => setSkipHandler(null));
    const target = button || getNextButton();
    const isButtonAlreadyReady =
      !!target && target.disabled === false && target.dataset?.nextReady === "true";
    if (!isButtonAlreadyReady) {
      guard(() => markNextButtonReady(target));
    }
    for (const evt of [
      "cooldown.timer.expired",
      "nextRoundTimerReady",
      "countdownFinished",
      "control.countdown.completed"
    ]) {
      guard(() => emitBattleEvent(evt));
    }
    const orchestratedActive =
      typeof document !== "undefined" &&
      !!document?.body?.dataset?.battleState;
    const canDispatchReadyDirectly =
      typeof machine?.dispatch === "function" &&
      !orchestratedActive &&
      !hasReadyBeenDispatchedForCurrentCooldown();
    const orchestratedHandled =
      typeof globalThis !== "undefined" &&
      globalThis.__classicBattleOrchestratedReady === true;
    const canDispatchReady =
      typeof machine?.dispatch === "function" &&
      !orchestratedHandled &&
      !hasReadyBeenDispatchedForCurrentCooldown();
    if (canDispatchReady) {
      setReadyDispatchedForCurrentCooldown(true);
    }
    guardAsync(async () => {
      if (!canDispatchReady) return;
      try {
        await Promise.resolve(machine.dispatch("ready"));
      } catch (error) {
        setReadyDispatchedForCurrentCooldown(false);
        throw error;
      }
    });
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

/**
 * @summary Orchestrate the inter-round cooldown timer and fallback completion flow.
 *
 * @param {object} machine State machine instance.
 * @param {{ scheduler?: { setTimeout?: typeof setTimeout, clearTimeout?: typeof clearTimeout } }} [options]
 * @returns {Promise<void>}
 * @pseudocode
 * 1. Compute cooldown duration and emit countdown start events.
 * 2. Enable the Next button and mark it ready.
 * 3. Start engine-backed timer; on expire → mark ready, emit events, dispatch `ready`.
 * 4. Schedule fallback timer with same completion path.
 */
export async function initInterRoundCooldown(machine, options = {}) {
  const duration = resolveInterRoundCooldownDuration(computeNextRoundCooldown);

  guard(() => emitBattleEvent("countdownStart", { duration }));
  guard(() =>
    emitBattleEvent("control.countdown.started", {
      durationMs: duration * 1000
    })
  );

  const button = prepareNextButtonForCooldown(machine, options.scheduler);

  const timer = createRoundTimer({ starter: startCoolDown });
  const completion = createCooldownCompletion({
    machine,
    timer,
    button,
    scheduler: options.scheduler
  });

  setupInterRoundTimer({
    timer,
    duration,
    onExpired: completion.finish,
    onTick: (remaining) =>
      guard(() =>
        emitBattleEvent("cooldown.timer.tick", {
          remainingMs: Math.max(0, Number(remaining) || 0) * 1000
        })
      )
  });

  const fallbackId = scheduleCooldownFallback({
    duration,
    finish: completion.finish,
    scheduler: options.scheduler
  });
  completion.trackFallback(fallbackId);
}
