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
 *
 * @param {function(function, function, number): Promise<void>} startFn
 * - Function that starts the underlying timer.
 * @returns {function(number, function, function, function): Promise<void>}
 * - Function to run the timer with drift handling.
 */
export function runTimerWithDrift(
  startFn,
  { onSecondTick = scheduleSecond, cancel = cancelSchedule } = {}
) {
  return async function (duration, onTick, onExpired, onDriftGiveUp) {
    const MAX_DRIFT_RETRIES = 3;
    let retries = 0;
    let stopWatch;

    const expired = async () => {
      if (stopWatch) stopWatch();
      await onExpired();
    };

    const run = async (dur) => {
      const maybePromise = startFn(onTick, expired, dur);
      if (stopWatch) stopWatch();
      stopWatch = watchForDrift(dur, handleDrift, { onSecondTick, cancel });
      if (maybePromise && typeof maybePromise.then === "function") {
        await maybePromise;
      }
    };

    const handleDrift = async (remaining) => {
      retries += 1;
      if (retries > MAX_DRIFT_RETRIES) {
        if (stopWatch) stopWatch();
        await onDriftGiveUp();
        return;
      }
      scoreboard.showMessage("Waiting…");
      await run(remaining);
    };

    await run(duration);
  };
}
