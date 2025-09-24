import { vi } from "vitest";

function createScheduler(state) {
  return {
    setTimeout: vi.fn((handler, delay) => {
      const numericDelay = Number(delay);
      const normalizedDelay = Number.isFinite(numericDelay) && numericDelay > 0 ? numericDelay : 0;
      state.scheduled.push({ handler, delay: normalizedDelay });
    })
  };
}

async function runTask(state, task) {
  state.now += task.delay;
  task.handler();
  await Promise.resolve();
}

function createMockTime(state) {
  return function mockTime() {
    const spies = [];
    if (globalThis.performance && typeof globalThis.performance.now === "function") {
      spies.push(vi.spyOn(globalThis.performance, "now").mockImplementation(() => state.now));
    }
    spies.push(vi.spyOn(Date, "now").mockImplementation(() => state.now));
    return () => {
      for (const spy of spies) {
        spy.mockRestore();
      }
    };
  };
}

function createRunNext(state) {
  return async function runNext() {
    if (!state.scheduled.length) return;
    const task = state.scheduled.shift();
    await runTask(state, task);
  };
}

function createRunAll(state) {
  return async function runAll(limit = 50) {
    let iterations = 0;
    while (state.scheduled.length) {
      iterations += 1;
      if (iterations > limit) {
        throw new Error(`Manual scheduler exceeded iteration limit (${limit})`);
      }
      const task = state.scheduled.shift();
      await runTask(state, task);
    }
  };
}

function createRunUntilResolved(state) {
  return async function runUntilResolved(promise, limit = 50) {
    let settled = false;
    promise.finally(() => {
      settled = true;
    });
    let iterations = 0;
    let idleIterations = 0;
    while (!settled) {
      if (state.scheduled.length) {
        iterations += 1;
        idleIterations = 0;
        if (iterations > limit) {
          throw new Error(
            `Manual scheduler exceeded iteration limit (${limit}) while awaiting promise resolution`
          );
        }
        const task = state.scheduled.shift();
        await runTask(state, task);
        continue;
      }
      idleIterations += 1;
      if (idleIterations > limit) {
        throw new Error("Manual scheduler remained idle while the promise was pending");
      }
      await Promise.resolve();
    }
    await promise;
  };
}

/**
 * Creates manual timing controls for deterministic testing of async operations.
 *
 * @pseudocode
 * 1. Initialize state with current time and scheduled tasks
 * 2. Return object with scheduler, time mocking, and task execution methods
 * 3. Scheduler captures setTimeout calls without executing them
 * 4. Time mocking overrides Date.now and performance.now
 * 5. Task execution methods allow controlled advancement of time and task processing
 *
 * @returns {Object} Manual timing controls with scheduler, mockTime, runNext, runAll, runUntilResolved
 * @example
 * const timing = createManualTimingControls();
 * const restoreTime = timing.mockTime();
 * // Use timing.scheduler in place of real setTimeout
 * await timing.runNext(); // Execute next scheduled task
 * restoreTime(); // Restore original time functions
 */
export function createManualTimingControls() {
  const state = {
    now: 0,
    scheduled: []
  };
  return {
    scheduler: createScheduler(state),
    mockTime: createMockTime(state),
    runNext: createRunNext(state),
    runAll: createRunAll(state),
    runUntilResolved: createRunUntilResolved(state)
  };
}
