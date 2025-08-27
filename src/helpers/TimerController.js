// Use dynamic import of timerUtils within methods to ensure tests that mock
// the module with vi.doMock inside an individual test still take effect.
import { onSecondTick as scheduleSecond, cancel as cancelSchedule } from "../utils/scheduler.js";

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
  constructor({ onSecondTick = scheduleSecond, cancel = cancelSchedule } = {}) {
    this.currentTimer = null;
    this.remaining = 0;
    this.paused = false;
    this.onTickCb = null;
    this.onExpiredCb = null;
    this.onSecondTick = onSecondTick;
    this.cancel = cancel;
    this.driftId = null;
  }

  async #start(category, onTick, onExpired, duration, pauseOnHidden, onDrift) {
    const timerUtils = await import("./timerUtils.js");
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
    const start = Date.now();
    let pausedAt = null;
    let pausedMs = 0;

    this.currentTimer = timerUtils.createCountdownTimer(duration, {
      onTick: (r) => {
        this.remaining = r;
        if (this.onTickCb) this.onTickCb(r);
      },
      onExpired: async () => {
        if (this.onExpiredCb) await this.onExpiredCb();
      },
      pauseOnHidden,
      onSecondTick: this.onSecondTick,
      cancel: this.cancel
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
  }

  getState() {
    return { remaining: this.remaining, paused: this.paused };
  }

  hasActiveTimer() {
    return Boolean(this.currentTimer);
  }
}
