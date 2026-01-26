import { stopTimer } from "../BattleEngine.js";
import { exposeDebugState } from "../classicBattle/debugHooks.js";

const VALID_EVENTS = ["tick", "expired", "drift"];

/**
 * Validate timer options
 * @param {Object} opts - Options to validate
 * @throws {TypeError} if options are invalid
 * @pseudocode
 * 1. Return early if opts is null/undefined
 * 2. Check starter is function or null if provided
 * 3. Check onDriftFail is function if provided
 * 4. Check maxDriftRetries is positive number if provided
 * 5. Check fallbackTickInterval is positive number if provided
 */
function validateOptions(opts) {
  if (opts === null || opts === undefined) return;

  if (opts.starter !== undefined && opts.starter !== null && typeof opts.starter !== "function") {
    throw new TypeError("starter must be a function or null");
  }

  if (opts.onDriftFail !== undefined && typeof opts.onDriftFail !== "function") {
    throw new TypeError("onDriftFail must be a function");
  }

  if (opts.maxDriftRetries !== undefined) {
    if (typeof opts.maxDriftRetries !== "number" || opts.maxDriftRetries < 1) {
      throw new TypeError("maxDriftRetries must be a positive number");
    }
  }

  if (opts.fallbackTickInterval !== undefined) {
    if (typeof opts.fallbackTickInterval !== "number" || opts.fallbackTickInterval <= 0) {
      throw new TypeError("fallbackTickInterval must be a positive number");
    }
  }
}

/**
 * Create a round timer that emits tick, drift, and expiration events.
 *
 * @pseudocode
 * 1. Validate options
 * 2. Register listeners for `tick`, `expired`, and `drift` events.
 * 3. Start underlying engine timer via `starter` with internal handlers.
 * 4. On each tick, emit `tick(remaining)`.
 * 5. On drift, emit `drift(remaining)` and retry up to maxDriftRetries times; on failure call `onDriftFail` or expire.
 * 6. On expiration, emit `expired` once. Manual stop does not emit `expired`.
 *
 * @param {{
 *   starter?: (
 *     onTick: (remaining: number) => void,
 *     onExpired: () => void,
 *     dur: number,
 *     onDrift: (remaining: number) => void
 *   ) => void | Promise<void>,
 *   onDriftFail?: () => Promise<void> | void,
 *   maxDriftRetries?: number,
 *   fallbackTickInterval?: number
 * }} [opts] - Timer configuration options
 * @param {Function} [opts.starter] - External timer engine
 * @param {Function} [opts.onDriftFail] - Handler for drift failure after max retries
 * @param {number} [opts.maxDriftRetries=3] - Maximum drift retry attempts
 * @param {number} [opts.fallbackTickInterval=1000] - Fallback timer tick interval in ms
 *
 * @returns {{
 *   start: (dur: number, opts?: {resetRetries?: boolean}) => void | Promise<void>,
 *   stop: () => void,
 *   pause: () => void,
 *   resume: () => void,
 *   on: (event: "tick" | "expired" | "drift", handler: Function) => () => void,
 *   off: (event: "tick" | "expired" | "drift", handler: Function) => void,
 *   once: (event: "tick" | "expired" | "drift", handler: Function) => () => void,
 *   getState: () => {paused: boolean, currentRemaining: number, pausedRemaining: number, retries: number, isRunning: boolean},
 *   isPaused: () => boolean,
 *   isRunning: () => boolean,
 *   getRemaining: () => number,
 *   getRetries: () => number,
 *   waitForExpiration: () => Promise<void>,
 *   waitForNextTick: () => Promise<number>,
 *   dispose: () => void
 * }} Timer control object
 *
 * @example Basic usage
 * const timer = createRoundTimer();
 * timer.on('tick', (remaining) => console.log(`${remaining}s left`));
 * timer.on('expired', () => console.log('Time up!'));
 * timer.start(10);
 *
 * @example With pause/resume
 * const timer = createRoundTimer();
 * timer.start(30);
 * setTimeout(() => timer.pause(), 5000);
 * setTimeout(() => timer.resume(), 10000);
 *
 * @example With drift handling
 * const timer = createRoundTimer({
 *   onDriftFail: async () => {
 *     console.log('Drift failed, recovering...');
 *   }
 * });
 */
export function createRoundTimer({
  starter = null,
  onDriftFail,
  maxDriftRetries = 3,
  fallbackTickInterval = 1000
} = {}) {
  validateOptions({ starter, onDriftFail, maxDriftRetries, fallbackTickInterval });

  const MAX_DRIFT_RETRIES = maxDriftRetries;
  const TICK_INTERVAL_MS = fallbackTickInterval;
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
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error(`Error in timer ${event} listener:`, error);
        }
      }
    }
  }

  function on(event, handler) {
    if (!VALID_EVENTS.includes(event)) {
      throw new TypeError(`Invalid event: "${event}". Must be one of: ${VALID_EVENTS.join(", ")}`);
    }
    if (typeof handler !== "function") {
      throw new TypeError("Handler must be a function");
    }
    listeners[event].add(handler);
    return () => off(event, handler);
  }

  function off(event, handler) {
    if (!VALID_EVENTS.includes(event)) {
      throw new TypeError(`Invalid event: "${event}". Must be one of: ${VALID_EVENTS.join(", ")}`);
    }
    listeners[event].delete(handler);
  }

  function once(event, handler) {
    if (!VALID_EVENTS.includes(event)) {
      throw new TypeError(`Invalid event: "${event}". Must be one of: ${VALID_EVENTS.join(", ")}`);
    }
    if (typeof handler !== "function") {
      throw new TypeError("Handler must be a function");
    }

    const wrapper = (payload) => {
      off(event, wrapper);
      handler(payload);
    };

    return on(event, wrapper);
  }

  function start(dur, { resetRetries = true } = {}) {
    if (typeof dur !== "number" || !Number.isFinite(dur)) {
      throw new TypeError("Duration must be a finite number");
    }

    if (dur < 0) {
      throw new RangeError("Duration must be non-negative");
    }

    paused = false;
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
      if (Number.isFinite(total)) {
        currentRemaining = total < 0 ? 0 : total;
      } else {
        currentRemaining = 0;
      }
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
    if (!resetRetries) {
      // Resuming, don't emit initial tick
    } else {
      emitTick(remaining);
    }
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
    // Start the tick loop after TICK_INTERVAL_MS, or immediately if resuming
    const delay = resetRetries ? TICK_INTERVAL_MS : 0;
    fallbackTimeoutId = setTimeout(tick, delay);
  }

  function emitTick(remaining) {
    // Synchronize currentRemaining with engine-driven ticks for accurate pause/resume
    const normalized = Number(remaining);
    if (Number.isFinite(normalized)) {
      currentRemaining = normalized < 0 ? 0 : normalized;
    } else {
      currentRemaining = 0;
    }
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
    paused = false;
    pausedRemaining = 0;
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
    if (paused) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Timer already paused");
      }
      return;
    }

    if (currentRemaining <= 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Cannot pause expired timer");
      }
      return;
    }

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
    if (!paused) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Timer not paused");
      }
      return;
    }

    if (pausedRemaining <= 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Cannot resume expired timer");
      }
      return;
    }

    paused = false;
    start(pausedRemaining, { resetRetries: false });
    pausedRemaining = 0;
  }

  function getState() {
    return {
      paused,
      currentRemaining,
      pausedRemaining,
      retries,
      isRunning: fallbackTimeoutId !== null
    };
  }

  function isPaused() {
    return paused;
  }

  function isRunning() {
    return fallbackTimeoutId !== null || currentRemaining > 0;
  }

  function getRemaining() {
    return paused ? pausedRemaining : currentRemaining;
  }

  function getRetries() {
    return retries;
  }

  function waitForExpiration() {
    return new Promise((resolve) => {
      once("expired", resolve);
    });
  }

  function waitForNextTick() {
    return new Promise((resolve) => {
      once("tick", resolve);
    });
  }

  function dispose() {
    stop();
    listeners.tick.clear();
    listeners.expired.clear();
    listeners.drift.clear();
    retries = 0;
    paused = false;
    pausedRemaining = 0;
    currentRemaining = 0;
  }

  return {
    start,
    stop,
    pause,
    resume,
    on,
    off,
    once,
    getState,
    isPaused,
    isRunning,
    getRemaining,
    getRetries,
    waitForExpiration,
    waitForNextTick,
    dispose
  };
}
