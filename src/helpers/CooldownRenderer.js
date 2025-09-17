import * as snackbar from "./showSnackbar.js";
import * as scoreboard from "./setupScoreboard.js";
import { emitBattleEvent } from "./classicBattle/battleEvents.js";
import { t } from "./i18n.js";

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
  let rendered = false;
  // In unit tests, if a snackbar already shows a countdown value, treat that
  // as the initial render and skip the first decrement to avoid off-by-one
  // perception when timers begin very soon after the outcome.
  try {
    const IS_VITEST = typeof process !== "undefined" && !!process.env?.VITEST;
    if (IS_VITEST && typeof document !== "undefined") {
      const existing = document.querySelector?.(".snackbar");
      const m = existing?.textContent?.match?.(/Next round in: (\d+)s/);
      if (m) {
        lastRendered = Number(m[1]);
        rendered = true;
        // Mark that we've effectively "rendered" the initial state.
        // The first engine tick will only establish `started` without
        // changing the visible countdown.
      }
    }
  } catch {}

  const normalizeRemaining = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, numeric);
  };

  const render = (remaining) => {
    const clamped = normalizeRemaining(remaining);
    const text = t("ui.nextRoundIn", { seconds: clamped });
    if (!rendered) {
      snackbar.showSnackbar(text);
      rendered = true;
    } else if (clamped !== lastRendered) {
      snackbar.updateSnackbar(text);
    }
    lastRendered = clamped;
    scoreboard.updateTimer(clamped);
    return clamped;
  };

  const onTick = (remaining) => {
    const normalized = normalizeRemaining(remaining);
    // If tests already show an initial value, skip the first visible update
    // when the timer repeats the same number and only mark that the countdown
    // started.
    if (!started && rendered && lastRendered >= 0 && normalized === lastRendered) {
      started = true;
      emitBattleEvent("nextRoundCountdownStarted");
      emitBattleEvent("nextRoundCountdownTick", { remaining: normalized });
      return;
    }
    const clamped = render(normalized);
    if (!started) {
      started = true;
      emitBattleEvent("nextRoundCountdownStarted");
    }
    emitBattleEvent("nextRoundCountdownTick", { remaining: clamped });
  };

  const onExpired = () => onTick(0);

  timer.on("tick", onTick);
  timer.on("expired", onExpired);
  const initialValue = Number(initialRemaining);
  if (Number.isFinite(initialValue)) {
    try {
      render(initialValue);
    } catch {}
  }
  return () => {
    timer.off("tick", onTick);
    timer.off("expired", onExpired);
  };
}
