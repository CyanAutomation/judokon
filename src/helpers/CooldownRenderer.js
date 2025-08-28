import * as snackbar from "./showSnackbar.js";
import * as scoreboard from "./setupScoreboard.js";
import { emitBattleEvent } from "./classicBattle/battleEvents.js";

/**
 * Attach snackbar + scoreboard rendering to a timer.
 *
 * @pseudocode
 * 1. Subscribe to timer `tick` and `expired` events.
 * 2. On `tick`, emit countdown events and render snackbar.
 * 3. On `expired`, render final 0s, emit final tick, and clear scoreboard timer.
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
    const clamped = Math.max(0, remaining);
    const text = `Next round in: ${clamped}s`;
    if (!started) {
      snackbar.showSnackbar(text);
      started = true;
      emitBattleEvent("nextRoundCountdownStarted");
    } else if (clamped !== lastRendered) {
      snackbar.updateSnackbar(text);
    }
    emitBattleEvent("nextRoundCountdownTick", { remaining: clamped });
    if (clamped <= 0) {
      scoreboard.clearTimer();
      return;
    }
    lastRendered = clamped;
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
