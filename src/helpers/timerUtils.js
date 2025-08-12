import { fetchJson, importJsonModule } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

let timersPromise;
let cachedTimers;

async function loadTimers() {
  if (cachedTimers) return cachedTimers;
  if (!timersPromise) {
    timersPromise = fetchJson(`${DATA_DIR}gameTimers.json`).catch(async (err) => {
      console.warn("Failed to fetch gameTimers.json", err);
      return importJsonModule("../data/gameTimers.json");
    });
  }
  cachedTimers = await timersPromise;
  return cachedTimers;
}

/**
 * Retrieve the default timer value for a category.
 *
 * @param {string} category - Timer category to search.
 * @returns {Promise<number|undefined>} Resolved default timer value.
 */
export async function getDefaultTimer(category) {
  const timers = await loadTimers();
  const entry = timers.find((t) => t.category === category && t.default);
  return entry ? entry.value : undefined;
}

export function _resetForTest() {
  timersPromise = undefined;
  cachedTimers = undefined;
}

/**
 * Create a simple countdown timer with pause/resume support.
 *
 * @pseudocode
 * 1. Store the initial duration and callbacks.
 * 2. `start()` resets the remaining time and handles immediate expiration.
 *    - If the duration is non-positive, invoke `onTick(0)` and `onExpired`
 *      without starting an interval.
 *    - Otherwise, begin a 1s interval and invoke `onTick` immediately with
 *      the starting value.
 *    - On each tick, decrement `remaining` and call `onTick`.
 *    - When the value reaches 0, stop the interval and call `onExpired`.
 *    - When `pauseOnHidden` is true, attach a `visibilitychange` listener that
 *      pauses when the page is hidden and resumes when visible.
 * 3. `pause()` and `resume()` toggle a flag checked on each interval tick.
 * 4. `stop()` clears the interval and removes the visibility listener.
 *
 * @param {number} duration - Countdown duration in seconds.
 * @param {object} [options]
 * @param {Function} [options.onTick] - Called every second with remaining time.
 * @param {Function} [options.onExpired] - Called when the timer reaches zero.
 * @param {boolean} [options.pauseOnHidden=false] - Auto pause on page hide.
 * @returns {{ start: Function, stop: Function, pause: Function, resume: Function }}
 *          Timer control methods.
 */
export function createCountdownTimer(duration, { onTick, onExpired, pauseOnHidden } = {}) {
  let remaining = duration;
  let intervalId = null;
  let paused = false;

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
    intervalId = setInterval(async () => {
      try {
        await tick();
      } catch (err) {
        console.error("Error in countdown timer tick:", err);
      }
    }, 1000);
    if (pauseOnHidden && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
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
