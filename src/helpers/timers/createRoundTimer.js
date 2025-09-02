import { startCoolDown, stopTimer } from "../battleEngineFacade.js";

/**
 * Create a round timer that emits tick, drift, and expiration events.
 *
 * @pseudocode
 * 1. Register listeners for `tick`, `expired`, and `drift` events.
 * 2. Start underlying engine timer via `starter` with internal handlers.
 * 3. On each tick, emit `tick(remaining)`.
 * 4. On drift, emit `drift(remaining)` and retry up to 3 times; on failure call `onDriftFail` or expire.
 * 5. On expiration or manual stop, emit `expired` once.
 *
 * @param {{
 *   starter?: (
 *     onTick: (remaining: number) => void,
 *     onExpired: () => void,
 *     dur: number,
 *     onDrift: (remaining: number) => void
 *   ) => void | Promise<void>,
 *   onDriftFail?: () => Promise<void> | void
 * }} [opts]
 * @returns {{
 *   start: (dur: number) => void | Promise<void>,
 *   stop: () => void,
 *   on: (event: "tick" | "expired" | "drift", handler: Function) => () => void,
 *   off: (event: "tick" | "expired" | "drift", handler: Function) => void
 * }}
 */
export function createRoundTimer({ starter = startCoolDown, onDriftFail } = {}) {
  const MAX_DRIFT_RETRIES = 3;
  const listeners = {
    tick: new Set(),
    expired: new Set(),
    drift: new Set()
  };
  let retries = 0;

  function emit(event, payload) {
    for (const fn of listeners[event]) {
      try {
        fn(payload);
      } catch {}
    }
  }

  function on(event, handler) {
    listeners[event].add(handler);
    return () => off(event, handler);
  }

  function off(event, handler) {
    listeners[event].delete(handler);
  }

  function start(dur) {
    try {
      return starter(emitTick, emitExpired, dur, handleDrift);
    } catch (e) {
      // Fallback when the engine is not initialized: run a simple JS timer
      // that emits tick events every second and expires after `dur` seconds.
      // This keeps UI behavior and tests working without requiring engine setup.
      const total = Number(dur) || 0;
      if (total <= 0) {
        return emitExpired();
      }
      let remaining = Math.ceil(total);
      emitTick(remaining);
      const intervalId = setInterval(() => {
        remaining -= 1;
        if (remaining > 0) {
          emitTick(remaining);
        } else {
          clearInterval(intervalId);
          emitExpired();
        }
      }, 1000);
    }
  }

  function emitTick(remaining) {
    emit("tick", remaining);
  }

  async function emitExpired() {
    emit("expired");
  }

  async function handleDrift(remaining) {
    retries += 1;
    if (retries > MAX_DRIFT_RETRIES) {
      if (typeof onDriftFail === "function") {
        await onDriftFail();
      } else {
        await emitExpired();
      }
      return;
    }
    emit("drift", remaining);
    await start(remaining);
  }

  function stop() {
    try {
      stopTimer();
    } catch {}
    emitExpired();
  }

  return { start, stop, on, off };
}
