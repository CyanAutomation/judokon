// Use dynamic import of timerUtils within methods to ensure tests that mock
// the module with vi.doMock inside an individual test still take effect.
// When `timerUtils` is partially mocked without `createCountdownTimer`, an
// internal setTimeout-based countdown keeps tests operational.
import { onSecondTick as scheduleSecond, cancel as cancelSchedule } from "../utils/scheduler.js";
import { realScheduler } from "./scheduler.js";

let cachedTimerUtils = null;

/**
 * Preload timer utilities to reduce latency on first use.
 *
 * This attempts a best-effort import of the heavy `timerUtils` module and
 * caches the result so hot-path code can access it synchronously where
 * appropriate.
 *
 * @pseudocode
 * 1. Try to dynamically import `./timerUtils.js` during initialization so
 *    later calls avoid an in-line dynamic import on hot paths.
 * 2. Cache the imported module in `cachedTimerUtils` when successful.
 * 3. Swallow any import errors (tests/bundlers may mock or block dynamic import)
 *    to keep startup resilient and non-fatal.
 *
 * @returns {Promise<void>} Resolves when preload attempt completes.
 */
export async function preloadTimerUtils() {
  try {
    cachedTimerUtils = await import("./timerUtils.js");
  } catch {}
}

const FALLBACKS = {
  roundTimer: 30,
  coolDownTimer: 3
};
const DRIFT_THRESHOLD = 2;

/**
 * Control countdown timers for battle phases.
 *
 * @pseudocode
 * 1. Maintain internal state: `currentTimer`, `remaining`, `paused`, and callbacks.
 * 2. `startRound`/`startCoolDown` delegate to a shared `#start` helper that:
 *    a. Resolves a default duration when none provided, with fallbacks.
 *    b. Stops any existing timer and resets state.
 *    c. Creates a countdown timer with `createCountdownTimer`.
 *    d. Updates `remaining` on each tick and invokes provided callbacks.
 *    e. Compares expected vs. actual elapsed time and triggers `onDrift` when
 *       the difference exceeds a threshold.
 * 3. `pause` and `resume` update the `paused` flag and forward to the timer.
 * 4. `stop` halts the active timer and clears it.
 * 5. `getState` returns `{ remaining, paused }`.
 */
export class TimerController {
  constructor({
    onSecondTick = scheduleSecond,
    cancel = cancelSchedule,
    scheduler = realScheduler
  } = {}) {
    this.currentTimer = null;
    this.remaining = 0;
    this.paused = false;
    this.onTickCb = null;
    this.onExpiredCb = null;
    this.onSecondTick = onSecondTick;
    this.cancel = cancel;
    this.scheduler = scheduler;
    this.driftId = null;
    this.activeCategory = null;
    this.pauseOnHiddenSetting = false;
  }

  async #start(category, onTick, onExpired, duration, pauseOnHidden, onDrift) {
    let timerUtils = cachedTimerUtils;
    if (!timerUtils) {
      try {
        timerUtils = await import("./timerUtils.js");
        cachedTimerUtils = timerUtils;
      } catch {
        // Fallbacks below will handle missing module cases
      }
    }
    if (duration === undefined) {
      try {
        duration = await timerUtils.getDefaultTimer(category);
      } catch {
        duration = FALLBACKS[category];
      }
      if (typeof duration !== "number") duration = FALLBACKS[category];
    }
    this.stop();
    this.remaining = duration;
    this.paused = false;
    this.onTickCb = onTick;
    this.onExpiredCb = onExpired;
    this.activeCategory = category;
    this.pauseOnHiddenSetting = Boolean(pauseOnHidden);
    const start = Date.now();
    let pausedAt = null;
    let pausedMs = 0;
    const createTimer =
      timerUtils && "createCountdownTimer" in timerUtils
        ? timerUtils.createCountdownTimer
        : (
            d,
            {
              onTick: t,
              onExpired: e,
              pauseOnHidden: shouldPauseOnHidden,
              onSecondTick: _onSecondTick,
              cancel: _cancelSubscription,
              scheduler: providedScheduler
            } = {}
          ) => {
            void _onSecondTick;
            void _cancelSubscription;
            // Fallback for tests that partially mock `timerUtils` without
            // `createCountdownTimer`.
            let remaining = d;
            let id = 0;
            let paused = false;
            let visibilityListenerAttached = false;
            const activeScheduler =
              providedScheduler && typeof providedScheduler.setTimeout === "function"
                ? providedScheduler
                : thisScheduler;
            const setTimeoutFn =
              activeScheduler && typeof activeScheduler.setTimeout === "function"
                ? activeScheduler.setTimeout.bind(activeScheduler)
                : thisScheduler.setTimeout.bind(thisScheduler);
            const clearTimeoutFn =
              activeScheduler && typeof activeScheduler.clearTimeout === "function"
                ? activeScheduler.clearTimeout.bind(activeScheduler)
                : thisScheduler.clearTimeout.bind(thisScheduler);

            function scheduleNextTick() {
              id = setTimeoutFn(tick, 1000);
            }

            function clearTimeoutSafe() {
              if (!id) return;
              try {
                clearTimeoutFn(id);
              } catch {
                clearTimeoutFn(id);
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
              if (!shouldPauseOnHidden || visibilityListenerAttached) return;
              if (typeof document === "undefined") return;
              try {
                document.addEventListener("visibilitychange", handleVisibility);
                visibilityListenerAttached = true;
              } catch {}
            }

            function tick() {
              if (paused) return;
              remaining -= 1;
              if (typeof t === "function") t(remaining);
              if (remaining <= 0) {
                clearTimeoutSafe();
                removeVisibilityListener();
                if (typeof e === "function") e();
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
              remaining = d;
              paused = false;
              if (typeof t === "function") t(remaining);
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
                scheduleNextTick();
              }
            }

            return { start, stop, pause, resume };
          };

    // Use the injected scheduler (or realScheduler) for the fallback timers so
    // tests can inject a mock scheduler or the test helpers can replace timers.
    const thisScheduler = this.scheduler || realScheduler;

    this.currentTimer = createTimer(duration, {
      onTick: (r) => {
        this.remaining = r;
        if (this.onTickCb) this.onTickCb(r);
      },
      onExpired: async () => {
        if (this.onExpiredCb) await this.onExpiredCb();
      },
      pauseOnHidden,
      onSecondTick: this.onSecondTick,
      cancel: this.cancel,
      scheduler: thisScheduler
    });
    this.currentTimer.start();

    if (this.driftId !== null) this.cancel(this.driftId);
    this.driftId = this.onSecondTick(() => {
      if (!this.currentTimer) {
        this.cancel(this.driftId);
        this.driftId = null;
        return;
      }
      if (this.paused) {
        if (pausedAt === null) pausedAt = Date.now();
        return;
      }
      if (pausedAt !== null) {
        pausedMs += Date.now() - pausedAt;
        pausedAt = null;
      }
      const elapsed = Math.floor((Date.now() - start - pausedMs) / 1000);
      const expected = duration - elapsed;
      if (this.remaining - expected > DRIFT_THRESHOLD) {
        this.cancel(this.driftId);
        this.driftId = null;
        if (typeof onDrift === "function") onDrift(this.remaining);
      }
    });
  }

  startRound(onTick, onExpired, duration, onDrift) {
    return this.#start("roundTimer", onTick, onExpired, duration, true, onDrift);
  }

  startCoolDown(onTick, onExpired, duration, onDrift) {
    return this.#start("coolDownTimer", onTick, onExpired, duration, false, onDrift);
  }

  pause() {
    this.paused = true;
    if (this.currentTimer) this.currentTimer.pause();
  }

  resume() {
    this.paused = false;
    if (this.currentTimer) this.currentTimer.resume();
  }

  stop() {
    if (this.currentTimer) {
      this.currentTimer.stop();
      this.currentTimer = null;
    }
    if (this.driftId !== null) {
      this.cancel(this.driftId);
      this.driftId = null;
    }
    this.activeCategory = null;
    this.pauseOnHiddenSetting = false;
  }

  /**
   * Provide a snapshot of the active timer state.
   *
   * @pseudocode
   * 1. Return an object containing `remaining`, `paused`, `category`, and `pauseOnHidden`.
   *
   * @returns {{remaining: number, paused: boolean, category: "roundTimer"|"coolDownTimer"|null, pauseOnHidden: boolean}}
   */
  getState() {
    return {
      remaining: this.remaining,
      paused: this.paused,
      category: this.activeCategory,
      pauseOnHidden: this.pauseOnHiddenSetting
    };
  }

  hasActiveTimer() {
    return Boolean(this.currentTimer);
  }

  /**
   * Report which category the active countdown represents.
   *
   * @pseudocode
   * 1. Return the cached `activeCategory` string or `null` when idle.
   *
   * @returns {"roundTimer"|"coolDownTimer"|null}
   */
  getActiveCategory() {
    return this.activeCategory;
  }
}
