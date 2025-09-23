import { getScheduler, realScheduler } from "../scheduler.js";

function resolveScheduler(candidate) {
  if (candidate && typeof candidate.setTimeout === "function") {
    return candidate;
  }
  try {
    const active = typeof getScheduler === "function" ? getScheduler() : null;
    if (active && typeof active.setTimeout === "function") {
      return active;
    }
  } catch {}
  return realScheduler && typeof realScheduler.setTimeout === "function" ? realScheduler : null;
}

/**
 * Create a throttled wait helper backed by the shared scheduler.
 *
 * @pseudocode
 * 1. Normalize `intervalMs` to a minimum of 50ms (default 75ms).
 * 2. Resolve an available scheduler via the injected candidate, shared scheduler, or `realScheduler`.
 * 3. Provide a `wait(delayMs?)` function that schedules a timeout and resolves `true` when timers are available.
 * 4. If scheduling fails, resolve `false` after a microtask so callers can gracefully fall back.
 *
 * @param {{ intervalMs?: number, scheduler?: { setTimeout?: Function } }} [options]
 * @returns {{ wait: (delayMs?: number) => Promise<boolean>, intervalMs: number }}
 */
export function createPollingThrottle(options = {}) {
  const numericInterval = Number(options.intervalMs);
  const defaultInterval =
    Number.isFinite(numericInterval) && numericInterval > 0 ? numericInterval : 75;
  const intervalMs = Math.max(50, defaultInterval);
  const scheduler = resolveScheduler(options.scheduler);

  const wait = (delayOverride) =>
    new Promise((resolve) => {
      const numericDelay = Number(delayOverride);
      const delayMs =
        Number.isFinite(numericDelay) && numericDelay >= 0 ? Math.max(0, numericDelay) : intervalMs;
      const finish = (usedTimer) => {
        resolve(usedTimer);
      };
      const activeScheduler =
        scheduler && typeof scheduler.setTimeout === "function" ? scheduler : null;
      if (activeScheduler) {
        try {
          activeScheduler.setTimeout(() => finish(true), delayMs);
          return;
        } catch {}
      }
      if (typeof setTimeout === "function") {
        try {
          setTimeout(() => finish(true), delayMs);
          return;
        } catch {}
      }
      try {
        if (typeof queueMicrotask === "function") {
          queueMicrotask(() => finish(false));
          return;
        }
      } catch {}
      finish(false);
    });

  return { wait, intervalMs };
}
