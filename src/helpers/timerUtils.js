import gameTimers from "../data/gameTimers.js";
import {
  onSecondTick as scheduleSecond,
  cancel as cancelSchedule,
  stop as stopScheduler
} from "../utils/scheduler.js";
import { realScheduler } from "./scheduler.js";

/**
 * Retrieve the default timer value for a category.
 *
 * @param {string} category Timer category to search.
 * @returns {number|undefined} Resolved default timer value.
 *
 * @summary Find the default timer for a given category.
 * @pseudocode
 * 1. Locate the timer entry whose category matches and is marked as default.
 * 2. Return its value or `undefined` if none found.
 */
export function getDefaultTimer(category) {
  // Test hook: allow Playwright or other harnesses to override timers globally.
  try {
    const w = typeof window !== "undefined" ? window : globalThis;
    const overrides = w && w.__OVERRIDE_TIMERS;
    if (overrides && Object.prototype.hasOwnProperty.call(overrides, category)) {
      const v = overrides[category];
      if (typeof v === "number") return v;
    }
  } catch {}
  const entry = gameTimers.find((t) => t.category === category && t.default);
  return entry ? entry.value : undefined;
}

/**
 * Reset timer state and stop the shared scheduler used by tests.
 *
 * @pseudocode
 * 1. Stop the shared scheduler to avoid leaking background ticks in tests.
 *
 * @returns {void}
 */
export function _resetForTest() {
  stopScheduler();
}

/**
 * Create a simple countdown timer with pause/resume support.
 *
 * @pseudocode
 * 1. Store the initial duration and callbacks.
 * 2. `start()` resets the remaining time and handles immediate expiration.
 *    - If the duration is non-positive, invoke `onTick(0)` and `onExpired`
 *      without starting an interval.
 *    - Otherwise, subscribe to the shared scheduler via `scheduler.onSecondTick`
 *      and invoke `onTick` immediately with the starting value.
 *    - When no subscription id is returned, fall back to `setInterval`.
 *    - On each tick, decrement `remaining` and call `onTick`.
 *    - When the value reaches 0, cancel the active timer and call `onExpired`.
 *    - When `pauseOnHidden` is true, attach a `visibilitychange` listener that
 *      pauses when the page is hidden and resumes when visible.
 * 3. `pause()` and `resume()` toggle a flag checked on each tick.
 * 4. `stop()` cancels the scheduler subscription and removes the visibility
 *    listener.
 *
 * @param {number} duration - Countdown duration in seconds.
 * @param {object} [options]
 * @param {Function} [options.onTick] - Called every second with remaining time.
 * @param {Function} [options.onExpired] - Called when the timer reaches zero.
 * @param {boolean} [options.pauseOnHidden=false] - Auto pause on page hide.
 * @returns {{ start: Function, stop: Function, pause: Function, resume: Function }}
 *          Timer control methods.
 */
export function createCountdownTimer(
  duration,
  {
    onTick,
    onExpired,
    pauseOnHidden,
    onSecondTick = scheduleSecond,
    cancel = cancelSchedule,
    scheduler = realScheduler
  } = {}
) {
  let remaining = duration;
  let subId = null;
  let cancelFn = cancel;
  let paused = false;
  let hardTimeoutId = 0;
  const activeScheduler =
    scheduler && typeof scheduler.setTimeout === "function" ? scheduler : realScheduler;
  const clearFromScheduler =
    scheduler && typeof scheduler.clearTimeout === "function"
      ? scheduler.clearTimeout.bind(scheduler)
      : realScheduler.clearTimeout.bind(realScheduler);

  async function tick() {
    if (paused) return;
    remaining -= 1;
    if (typeof onTick === "function") onTick(remaining);
    if (remaining <= 0) {
      stop();
      if (typeof onExpired === "function") await onExpired();
    }
  }

  function handleVisibility() {
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
    if (remaining <= 0) {
      if (typeof onTick === "function") onTick(0);
      if (typeof onExpired === "function") onExpired();
      return;
    }
    if (typeof onTick === "function") onTick(remaining);
    subId = onSecondTick(async () => {
      try {
        await tick();
      } catch (err) {
        console.error("Error in countdown timer tick:", err);
      }
    });
    if (subId === undefined || subId === null) {
      const intervalId = setInterval(async () => {
        try {
          await tick();
        } catch (err) {
          console.error("Error in countdown timer tick:", err);
        }
      }, 1000);
      subId = intervalId;
      cancelFn = (id) => clearInterval(id);
    } else {
      cancelFn = cancel;
    }
    // Hard fallback to ensure expiration even if the scheduler never ticks
    // in certain test environments.
    try {
      if (typeof globalThis !== "undefined") {
        globalThis.__hardTimeoutScheduled = (globalThis.__hardTimeoutScheduled || 0) + 1;
      }
      hardTimeoutId = activeScheduler.setTimeout(
        async () => {
          if (subId !== null) {
            // Timer still running; stop and expire once.
            stop();
            if (typeof onTick === "function") onTick(0);
            if (typeof onExpired === "function") await onExpired();
          }
        },
        Math.max(0, Math.floor(remaining) * 1000)
      );
    } catch (error) {
      if (typeof console !== "undefined") {
        console.error("[dedupe] hard timeout error", error);
      }
    }
    if (pauseOnHidden && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }
  }

  function stop() {
    if (subId !== null) {
      cancelFn(subId);
      subId = null;
    }
    if (hardTimeoutId) {
      clearFromScheduler(hardTimeoutId);
      hardTimeoutId = 0;
    }
    if (pauseOnHidden && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibility);
    }
  }

  function pause() {
    paused = true;
  }

  function resume() {
    paused = false;
  }

  return { start, stop, pause, resume };
}
