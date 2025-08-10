import { getDefaultTimer, createCountdownTimer } from "./timerUtils.js";

const FALLBACKS = {
  roundTimer: 30,
  coolDownTimer: 3
};

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
 * 3. `pause` and `resume` update the `paused` flag and forward to the timer.
 * 4. `stop` halts the active timer and clears it.
 * 5. `getState` returns `{ remaining, paused }`.
 */
export class TimerController {
  constructor() {
    this.currentTimer = null;
    this.remaining = 0;
    this.paused = false;
    this.onTickCb = null;
    this.onExpiredCb = null;
  }

  async #start(category, onTick, onExpired, duration, pauseOnHidden) {
    if (duration === undefined) {
      try {
        duration = await getDefaultTimer(category);
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
    this.currentTimer = createCountdownTimer(duration, {
      onTick: (r) => {
        this.remaining = r;
        if (this.onTickCb) this.onTickCb(r);
      },
      onExpired: async () => {
        if (this.onExpiredCb) await this.onExpiredCb();
      },
      pauseOnHidden
    });
    this.currentTimer.start();
  }

  startRound(onTick, onExpired, duration) {
    return this.#start("roundTimer", onTick, onExpired, duration, true);
  }

  startCoolDown(onTick, onExpired, duration) {
    return this.#start("coolDownTimer", onTick, onExpired, duration, false);
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
  }

  getState() {
    return { remaining: this.remaining, paused: this.paused };
  }

  hasActiveTimer() {
    return Boolean(this.currentTimer);
  }
}
