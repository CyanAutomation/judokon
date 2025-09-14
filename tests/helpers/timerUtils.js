/*
 * Test timer utilities to avoid flaky waits and real timers in unit tests.
 * Exposes helpers to run code under fake timers and advance time deterministically.
 */
export function runWithFakeTimers(fn) {
  // Prefer vitest's fake timers if available, otherwise fallback to global
  const viGlobal = typeof vi !== "undefined" ? vi : null;
  if (viGlobal && typeof viGlobal.useFakeTimers === "function") {
    viGlobal.useFakeTimers();
    try {
      const res = fn();
      // If fn returns a promise, await it while timers are fake
      if (res && typeof res.then === "function") {
        return res.finally(() => viGlobal.runAllTimers());
      }
      return res;
    } finally {
      try {
        viGlobal.runAllTimers();
      } catch {
        // ignore
      }
      viGlobal.useRealTimers();
    }
  }

  // Fallback: run directly (tests should prefer vitest)
  return fn();
}

export function createSchedulerAdapter(mockScheduler) {
  // Adapter for code under test that expects global setTimeout/clearTimeout
  return {
    install() {
      this._orig = { setTimeout: global.setTimeout, clearTimeout: global.clearTimeout };
      global.setTimeout = mockScheduler.setTimeout.bind(mockScheduler);
      global.clearTimeout = mockScheduler.clearTimeout.bind(mockScheduler);
    },
    uninstall() {
      if (this._orig) {
        global.setTimeout = this._orig.setTimeout;
        global.clearTimeout = this._orig.clearTimeout;
        this._orig = null;
      }
    }
  };
}
