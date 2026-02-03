import { emitBattleEvent } from "./battleEvents.js";

const DEFAULT_EMIT_EVENT = emitBattleEvent;

const clampRemaining = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
};

/**
 * Emit a countdown tick event payload.
 *
 * @pseudocode
 * 1. Clamp the remaining seconds to a non-negative finite number.
 * 2. Emit `countdownTick` for the canonical event payload.
 * 3. Emit `nextRoundCountdownTick` for legacy listeners.
 *
 * @param {number} remaining - Remaining seconds.
 * @param {(name: string, detail?: object) => void} [emitEvent]
 * @returns {void}
 */
export function emitCountdownTick(remaining, emitEvent = DEFAULT_EMIT_EVENT) {
  const clamped = clampRemaining(remaining);
  emitEvent("countdownTick", { remaining: clamped });
  emitEvent("nextRoundCountdownTick", { remaining: clamped });
}

/**
 * Emit a countdown finished event.
 *
 * @pseudocode
 * 1. Emit the canonical `countdownFinished` event on the battle bus.
 *
 * @param {(name: string, detail?: object) => void} [emitEvent]
 * @returns {void}
 */
export function emitCountdownFinished(emitEvent = DEFAULT_EMIT_EVENT) {
  emitEvent("countdownFinished");
}

/**
 * Coordinate timer ticks, rendering, and battle events for countdowns.
 *
 * @pseudocode
 * 1. Attach the countdown renderer (if provided) to the timer.
 * 2. Listen for `tick` events and emit countdown tick signals.
 * 3. Listen for `expired` events and emit the countdown finished signal.
 * 4. Return cleanup helpers for detach/start/stop.
 *
 * @param {{
 *   timer: { on: Function, off: Function, start: Function, stop?: Function },
 *   duration?: number,
 *   renderer?: ((timer: any, secs?: number, opts?: object) => void) | null,
 *   rendererOptions?: object,
 *   emitEvent?: (name: string, detail?: object) => void,
 *   onFinished?: (() => void) | null
 * }} params
 * @returns {{
 *   detach: () => void,
 *   start: (duration?: number) => void,
 *   stop: () => void
 * }}
 */
export function attachCountdownCoordinator({
  timer,
  duration,
  renderer,
  rendererOptions,
  emitEvent = DEFAULT_EMIT_EVENT,
  onFinished
}) {
  const emitTick = (remaining) => emitCountdownTick(remaining, emitEvent);
  const handleExpired = () => {
    emitCountdownFinished(emitEvent);
    if (typeof onFinished === "function") {
      onFinished();
    }
  };

  let detachRenderer = null;
  if (typeof renderer === "function") {
    try {
      const candidate = renderer(timer, duration, rendererOptions);
      if (typeof candidate === "function") {
        detachRenderer = candidate;
      }
    } catch {}
  }

  timer.on("tick", emitTick);
  timer.on("expired", handleExpired);

  return {
    detach: () => {
      timer.off("tick", emitTick);
      timer.off("expired", handleExpired);
      if (typeof detachRenderer === "function") {
        detachRenderer();
      }
    },
    start: (overrideDuration) => timer.start(overrideDuration ?? duration),
    stop: () => {
      if (typeof timer.stop === "function") {
        timer.stop();
      }
    }
  };
}
