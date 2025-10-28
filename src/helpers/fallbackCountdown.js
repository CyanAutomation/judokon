import { realScheduler } from "./scheduler.js";

/**
 * Delay in milliseconds applied before resuming the fallback countdown after
 * a tab visibility change.
 *
 * @pseudocode
 * 1. Export a shared constant so both production code and tests agree on the delay.
 * 2. Use the value when scheduling resume logic for visibility changes.
 *
 * @type {number}
 */
export const FALLBACK_VISIBILITY_RESUME_DELAY_MS = 150;

/**
 * Create a setTimeout-based countdown timer used when timerUtils#createCountdownTimer
 * is unavailable (e.g., partially mocked during tests).
 *
 * The helper mirrors the timerUtils countdown API while remaining resilient to
 * missing browser globals (document, scheduler). It also introduces a short
 * delay before resuming after a visibility change to avoid rapid pause/resume
 * thrashing when the tab focus changes quickly.
 *
 * @pseudocode
 * 1. Normalize the scheduler by preferring the provided scheduler or the fallback.
 * 2. Manage countdown state (remaining seconds, paused flag, visibility listener).
 * 3. Expose `start`, `stop`, `pause`, and `resume` methods mirroring the timerUtils API.
 * 4. When resuming after a visibility change, wait a short delay before restarting ticks.
 *
 * @param {number} duration - Number of seconds to count down from.
 * @param {object} [options]
 * @param {Function} [options.onTick]
 * @param {Function} [options.onExpired]
 * @param {boolean} [options.pauseOnHidden]
 * @param {Function} [options.onSecondTick] - Unused but preserved for API compatibility.
 * @param {Function} [options.cancel] - Unused but preserved for API compatibility.
 * @param {object} [options.scheduler]
 * @param {object} [options.fallbackScheduler]
 * @param {number} [options.resumeVisibilityDelayMs]
 * @returns {{ start: Function, stop: Function, pause: Function, resume: Function }}
 */
export function createFallbackCountdownTimer(
  duration,
  {
    onTick,
    onExpired,
    pauseOnHidden,
    onSecondTick: _onSecondTick,
    cancel: _cancelSubscription,
    scheduler: providedScheduler,
    fallbackScheduler = realScheduler,
    resumeVisibilityDelayMs = FALLBACK_VISIBILITY_RESUME_DELAY_MS
  } = {}
) {
  const compatibilityHandlers = [_onSecondTick, _cancelSubscription];
  // Evaluate preserved handlers to avoid unused warnings while keeping API compatibility.
  compatibilityHandlers.some(Boolean);

  const activeScheduler =
    providedScheduler && typeof providedScheduler.setTimeout === "function"
      ? providedScheduler
      : fallbackScheduler;

  const setTimeoutFn =
    activeScheduler && typeof activeScheduler.setTimeout === "function"
      ? activeScheduler.setTimeout.bind(activeScheduler)
      : fallbackScheduler.setTimeout.bind(fallbackScheduler);

  const clearTimeoutFn =
    activeScheduler && typeof activeScheduler.clearTimeout === "function"
      ? activeScheduler.clearTimeout.bind(activeScheduler)
      : fallbackScheduler.clearTimeout.bind(fallbackScheduler);

  let remaining = duration;
  let id = 0;
  let paused = false;
  let visibilityListenerAttached = false;

  function scheduleNextTick() {
    id = setTimeoutFn(tick, 1000);
  }

  function scheduleResumeTick() {
    if (resumeVisibilityDelayMs <= 0) {
      scheduleNextTick();
      return;
    }

    id = setTimeoutFn(() => {
      scheduleNextTick();
    }, resumeVisibilityDelayMs);
  }

  function clearTimeoutSafe() {
    if (!id) return;
    try {
      clearTimeoutFn(id);
    } catch (error) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("Timer cleanup failed:", error);
      }
    }
    id = 0;
  }

  function removeVisibilityListener() {
    if (!visibilityListenerAttached) return;
    if (typeof document === "undefined") return;
    try {
      document.removeEventListener("visibilitychange", handleVisibility);
    } catch {}
    visibilityListenerAttached = false;
  }

  function addVisibilityListener() {
    if (!pauseOnHidden || visibilityListenerAttached) return;
    if (typeof document === "undefined") return;
    try {
      document.addEventListener("visibilitychange", handleVisibility);
      visibilityListenerAttached = true;
    } catch {}
  }

  function tick() {
    if (paused) return;
    remaining -= 1;
    if (typeof onTick === "function") onTick(remaining);
    if (remaining <= 0) {
      clearTimeoutSafe();
      removeVisibilityListener();
      if (typeof onExpired === "function") onExpired();
    } else {
      scheduleNextTick();
    }
  }

  function handleVisibility() {
    if (typeof document === "undefined") return;
    if (document.hidden) {
      pause();
    } else {
      resume();
    }
  }

  function start() {
    stop();
    remaining = duration;
    paused = false;
    if (typeof onTick === "function") onTick(remaining);
    scheduleNextTick();
    addVisibilityListener();
  }

  function stop() {
    clearTimeoutSafe();
    paused = false;
    removeVisibilityListener();
  }

  function pause() {
    clearTimeoutSafe();
    paused = true;
  }

  function resume() {
    if (!paused) return;
    paused = false;
    if (remaining > 0 && !id) {
      scheduleResumeTick();
    }
  }

  return { start, stop, pause, resume };
}
