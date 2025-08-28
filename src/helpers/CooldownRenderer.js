import * as snackbar from "./showSnackbar.js";
import * as scoreboard from "./setupScoreboard.js";

/**
 * Attach snackbar + scoreboard rendering to a timer.
 *
 * @pseudocode
 * 1. Subscribe to timer `tick` and `expired` events.
 * 2. On `tick`, show or update snackbar with remaining seconds.
 * 3. On `expired`, render final 0s and clear scoreboard timer.
 * 4. Optionally render initial remaining immediately when provided.
 *
 * @param {{on: Function, off: Function}} timer - Timer with event API.
 * @param {number} [initialRemaining] - Seconds remaining to render initially.
 * @returns {() => void} Detach function.
 */
export function attachCooldownRenderer(timer, initialRemaining) {
  let started = false;
  let lastRendered = -1;

  const onTick = (remaining) => {
    if (remaining <= 0) {
      const text = "Next round in: 0s";
      if (!started) {
        snackbar.showSnackbar(text);
        started = true;
      } else {
        snackbar.updateSnackbar(text);
      }
      scoreboard.clearTimer();
      return;
    }
    if (remaining === lastRendered) return;
    const text = `Next round in: ${remaining}s`;
    if (!started) {
      snackbar.showSnackbar(text);
      started = true;
    } else {
      snackbar.updateSnackbar(text);
    }
    lastRendered = remaining;
  };

  const onExpired = () => onTick(0);

  timer.on("tick", onTick);
  timer.on("expired", onExpired);
  if (typeof initialRemaining === "number") {
    onTick(initialRemaining);
  }
  return () => {
    timer.off("tick", onTick);
    timer.off("expired", onExpired);
  };
}
