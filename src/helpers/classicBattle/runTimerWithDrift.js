import { watchForDrift } from "../battleEngineFacade.js";
import * as scoreboard from "../setupScoreboard.js";
import { onSecondTick as scheduleSecond, cancel as cancelSchedule } from "../../utils/scheduler.js";

/**
 * Create a timer runner that monitors for drift and retries when detected.
 *
 * @pseudocode
 * 1. Start the timer using `startFn` with `onTick` and `onExpired` callbacks.
 * 2. Use `watchForDrift` to detect desync; on drift, show "Waiting…" and
 *    restart the timer, giving up after several retries.
 * 3. On expiration or when giving up, stop monitoring and invoke the
 *    corresponding callback.
 * 4. Expose a `cancel` function to stop drift monitoring manually.
 *
 * @param {function(function, function, number): Promise<void>} startFn
 * - Function that starts the underlying timer.
 * @returns {{run: function(number, function, function, function): Promise<void>, cancel: function(): void}}
 * - Object with `run` and `cancel` helpers for timer management.
 */
export function runTimerWithDrift(
  startFn,
  { onSecondTick = scheduleSecond, cancel = cancelSchedule } = {}
) {
  let stopWatch;
  const cancelWatch = () => {
    if (stopWatch) stopWatch();
  };

  async function run(duration, onTick, onExpired, onDriftGiveUp) {
    const MAX_DRIFT_RETRIES = 3;
    let retries = 0;

    const expired = async () => {
      cancelWatch();
      await onExpired();
    };

    async function handleDrift(remaining) {
      cancelWatch();
      retries += 1;
      if (retries > MAX_DRIFT_RETRIES) {
        await onDriftGiveUp();
        return;
      }
      scoreboard.showMessage("Waiting…");
      await start(remaining);
    }

    async function start(dur) {
      const maybePromise = startFn(onTick, expired, dur);
      cancelWatch();
      stopWatch = watchForDrift(dur, handleDrift, { onSecondTick, cancel });
      if (maybePromise && typeof maybePromise.then === "function") {
        await maybePromise;
      }
    }

    await start(duration);
  }

  return { run, cancel: cancelWatch };
}
