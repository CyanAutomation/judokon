import { stopTimer } from "../battleEngineFacade.js";
import { exposeDebugState } from "../classicBattle/debugHooks.js";

/**
 * Create a round timer that emits tick, drift, and expiration events.
 *
 * @pseudocode
 * 1. Register listeners for `tick`, `expired`, and `drift` events.
 * 2. Start underlying engine timer via `starter` with internal handlers.
 * 3. On each tick, emit `tick(remaining)`.
 * 4. On drift, emit `drift(remaining)` and retry up to 3 times; on failure call `onDriftFail` or expire.
 * 5. On expiration, emit `expired` once. Manual stop does not emit `expired`.
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
export function createRoundTimer({ starter = null, onDriftFail } = {}) {
  const MAX_DRIFT_RETRIES = 3;
  const listeners = {
    tick: new Set(),
    expired: new Set(),
    drift: new Set()
  };
  let retries = 0;
  let fallbackTimeoutId = null;
  let paused = false;
  let pausedRemaining = 0;
  let currentRemaining = 0;

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

  function start(dur, { resetRetries = true } = {}) {
    if (resetRetries) {
      retries = 0;
    }
    if (fallbackTimeoutId !== null) {
      try {
        clearTimeout(fallbackTimeoutId);
      } catch {}
      fallbackTimeoutId = null;
    }
    const total = Number(dur) || 0;
    const useEngine = typeof starter === "function";
    if (useEngine) {
      try {
        return starter(emitTick, emitExpired, total, handleDrift);
      } catch {
        // fall through to JS timer
      }
    }
    // Pure JS timer fallback (also default when no starter provided)
    if (total <= 0) {
      return emitExpired();
    }
    let remaining = Math.ceil(total);
    currentRemaining = remaining;
    emitTick(remaining);
    const tick = () => {
      try {
        // Decrement remaining and emit tick/expired accordingly. Use a
        // simple setTimeout chain to work reliably with fake timers.
        remaining -= 1;
        currentRemaining = remaining;
        if (remaining > 0) {
          emitTick(remaining);
          fallbackTimeoutId = setTimeout(tick, 1000);
        } else {
          fallbackTimeoutId = null;
          emitExpired();
        }
      } catch {
        try {
          if (fallbackTimeoutId !== null) {
            clearTimeout(fallbackTimeoutId);
            fallbackTimeoutId = null;
          }
        } catch {}
      }
    };
    // Start the tick loop after 1 second
    fallbackTimeoutId = setTimeout(tick, 1000);
  }

  function emitTick(remaining) {
    emit("tick", remaining);
  }

  async function emitExpired() {
    exposeDebugState("timerEmitExpiredCalled", true);
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
    await start(remaining, { resetRetries: false });
  }

  function stop() {
    if (fallbackTimeoutId !== null) {
      try {
        clearTimeout(fallbackTimeoutId);
      } catch {}
      fallbackTimeoutId = null;
    }
    try {
      stopTimer();
    } catch {}
    // Do not emit "expired" on manual stop. Expiration semantics should
    // only fire when the countdown naturally reaches zero; emitting here
    // causes duplicate resolution paths (e.g., awarding extra points or
    // triggering cooldown) when a user actively selects a stat or skips.
  }

  function pause() {
    if (paused || currentRemaining <= 0) return;
    paused = true;
    pausedRemaining = currentRemaining;
    if (fallbackTimeoutId !== null) {
      clearTimeout(fallbackTimeoutId);
      fallbackTimeoutId = null;
    }
    try {
      stopTimer();
    } catch {}
  }

  function resume() {
    if (!paused || pausedRemaining <= 0) return;
    paused = false;
    start(pausedRemaining, { resetRetries: false });
    pausedRemaining = 0;
  }

  return { start, stop, pause, resume, on, off };
}
