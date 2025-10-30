import { vi } from "vitest";

/**
 * @typedef {Object} IdleDeadline
 * @property {boolean} didTimeout
 * @property {() => number} timeRemaining
 */

/**
 * @typedef {Object} FlushOptions
 * @property {boolean} [didTimeout=false]
 * @property {number | ((elapsed: number) => number)} [timeRemaining=50]
 * @property {(error: unknown) => void} [onTimeRemainingError]
 * @property {boolean} [suppressTimeRemainingErrors=false]
 */

/**
 * @typedef {Object} FlushResult
 * @property {number} id
 * @property {number} elapsed
 * @property {IdleDeadline} deadline
 */

/**
 * Install a deterministic requestIdleCallback/cancelIdleCallback mock.
 * Provides utilities to flush idle tasks with synthetic deadlines and
 * restores the original globals when finished.
 *
 * @returns {{
 *   requestIdleCallback: ReturnType<typeof vi.fn>,
 *   cancelIdleCallback: ReturnType<typeof vi.fn>,
 *   flushNext: (options?: FlushOptions) => (FlushResult | null),
 *   flushAll: (options?: FlushOptions) => Array<FlushResult>,
 *   getScheduledCount: () => number,
 *   restore: () => void
 * }}
 */
export function installIdleCallbackMock() {
  const target = typeof window !== "undefined" ? window : globalThis;
  const originalRequestIdleCallback = target.requestIdleCallback;
  const originalCancelIdleCallback = target.cancelIdleCallback;

  const scheduled = new Map();
  let nextId = 1;

  const requestIdleCallback = vi.fn((cb, options = {}) => {
    const id = nextId++;
    scheduled.set(id, { cb, options, scheduledAt: Date.now() });
    return id;
  });

  const cancelIdleCallback = vi.fn((id) => scheduled.delete(id));

  target.requestIdleCallback = requestIdleCallback;
  target.cancelIdleCallback = cancelIdleCallback;

  const buildDeadline = (options, elapsed) => {
    const {
      didTimeout = false,
      timeRemaining = 50,
      onTimeRemainingError,
      suppressTimeRemainingErrors = false
    } = options ?? {};
    if (typeof timeRemaining === "function") {
      return {
        didTimeout,
        timeRemaining: () => {
          try {
            return timeRemaining(elapsed);
          } catch (error) {
            if (typeof onTimeRemainingError === "function") {
              onTimeRemainingError(error);
            }
            if (suppressTimeRemainingErrors) {
              return 0;
            }
            throw error;
          }
        }
      };
    }
    return {
      didTimeout,
      timeRemaining: () => Number(timeRemaining)
    };
  };

  const flushNext = (options) => {
    const iterator = scheduled.entries().next();
    if (iterator.done) return null;
    const [id, task] = iterator.value;
    scheduled.delete(id);
    const now = Date.now();
    const elapsed = now - task.scheduledAt;
    const deadline = buildDeadline(options, elapsed);
    task.cb(deadline);
    return { id, elapsed, deadline };
  };

  const flushAll = (options) => {
    const results = [];
    while (scheduled.size) {
      const result = flushNext(options);
      if (!result) break;
      results.push(result);
    }
    return results;
  };

  const restore = () => {
    scheduled.clear();
    nextId = 1;
    const restoreProperty = (propName, originalValue) => {
      if (typeof originalValue === "function") {
        target[propName] = originalValue;
        return;
      }

      if (originalValue === undefined) {
        delete target[propName];
        return;
      }

      target[propName] = originalValue;
    };

    restoreProperty("requestIdleCallback", originalRequestIdleCallback);
    restoreProperty("cancelIdleCallback", originalCancelIdleCallback);
  };

  return {
    requestIdleCallback,
    cancelIdleCallback,
    flushNext,
    flushAll,
    getScheduledCount: () => scheduled.size,
    restore
  };
}
