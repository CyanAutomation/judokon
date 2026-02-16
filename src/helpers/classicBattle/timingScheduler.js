/**
 * @typedef {{
 *   schedule: (callback: () => void, delayMs?: number) => any,
 *   cancel: (handle: any) => void,
 *   now: () => number,
 *   setTimeout?: (callback: () => void, delayMs?: number) => any,
 *   clearTimeout?: (handle: any) => void
 * }} ClassicBattleScheduler
 */

function normalizeDelay(delayMs) {
  const parsed = Number(delayMs);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

/**
 * Create a real-time scheduler backed by global timers.
 *
 * @pseudocode
 * 1. Create `schedule` by delegating to `globalThis.setTimeout` with sanitized delay.
 * 2. Create `cancel` by delegating to `globalThis.clearTimeout`.
 * 3. Return the scheduler object with `schedule`, `cancel`, `now`, and timeout aliases.
 *
 * @returns {ClassicBattleScheduler}
 */
export function createTimeScheduler() {
  const schedule = (callback, delayMs = 0) =>
    globalThis.setTimeout(callback, normalizeDelay(delayMs));
  const cancel = (handle) => {
    globalThis.clearTimeout(handle);
  };

  return {
    schedule,
    cancel,
    now: () => Date.now(),
    setTimeout: schedule,
    clearTimeout: cancel
  };
}

/**
 * Create a headless scheduler for deterministic non-DOM execution.
 *
 * @param {{mode?: "immediate"|"virtual"}} [options]
 * @pseudocode
 * 1. Resolve mode to `immediate` or `virtual`.
 * 2. In immediate mode, run callbacks synchronously and increment virtual time per schedule call.
 * 3. In virtual mode, enqueue callbacks by runAt timestamp.
 * 4. Expose `advanceBy(ms)` to execute queued callbacks whose runAt is now due.
 * 5. Return the normalized scheduler shape plus timeout aliases.
 *
 * @returns {ClassicBattleScheduler & {advanceBy?: (ms: number) => void}}
 */
export function createHeadlessScheduler(options = {}) {
  const mode = options.mode === "virtual" ? "virtual" : "immediate";

  if (mode === "immediate") {
    let currentTime = 0;
    const schedule = (callback) => {
      currentTime += 1;
      callback?.();
      return currentTime;
    };

    return {
      schedule,
      cancel: () => {},
      now: () => currentTime,
      setTimeout: schedule,
      clearTimeout: () => {}
    };
  }

  let currentTime = 0;
  let nextId = 0;
  const queue = new Map();

  const schedule = (callback, delayMs = 0) => {
    const id = ++nextId;
    queue.set(id, {
      runAt: currentTime + normalizeDelay(delayMs),
      callback
    });
    return id;
  };

  const cancel = (handle) => {
    queue.delete(handle);
  };

  const advanceBy = (ms) => {
    currentTime += normalizeDelay(ms);
    const ready = Array.from(queue.entries())
      .filter(([, task]) => task.runAt <= currentTime)
      .sort((a, b) => a[1].runAt - b[1].runAt || a[0] - b[0]);

    for (const [id, task] of ready) {
      queue.delete(id);
      task.callback?.();
    }
  };

  return {
    schedule,
    cancel,
    now: () => currentTime,
    advanceBy,
    setTimeout: schedule,
    clearTimeout: cancel
  };
}

/**
 * Normalize mixed scheduler shapes to the classic battle scheduler interface.
 *
 * @param {Partial<ClassicBattleScheduler>|null|undefined} scheduler
 * @pseudocode
 * 1. If scheduler already exposes `schedule/cancel`, return as-is.
 * 2. If scheduler exposes `setTimeout`, wrap it into `schedule/cancel` plus `now` fallback.
 * 3. Otherwise return a real-time scheduler.
 *
 * @returns {ClassicBattleScheduler}
 */
export function ensureClassicBattleScheduler(scheduler) {
  if (
    scheduler &&
    typeof scheduler.schedule === "function" &&
    typeof scheduler.cancel === "function"
  ) {
    return scheduler;
  }

  if (scheduler && typeof scheduler.setTimeout === "function") {
    const schedule = (callback, delayMs = 0) =>
      scheduler.setTimeout(callback, normalizeDelay(delayMs));
    const cancel = (handle) => {
      if (typeof scheduler.clearTimeout === "function") {
        scheduler.clearTimeout(handle);
      }
    };

    return {
      schedule,
      cancel,
      now: () => (typeof scheduler.now === "function" ? scheduler.now() : Date.now()),
      setTimeout: schedule,
      clearTimeout: cancel
    };
  }

  return createTimeScheduler();
}
