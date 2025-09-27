import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as roundManager from "@/helpers/classicBattle/roundManager.js";

describe("cooldown auto-advance wiring", () => {
  let bus;
  let virtualTime;
  let nextTimeoutId;
  let creationOrder;
  let pendingTimeouts;
  let scheduler;
  let flushScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    // jsdom body for dataset checks used by cooldown
    if (typeof document !== "undefined") {
      document.body.innerHTML =
        '<button id="next-button" disabled data-role="next-round">Next</button>';
      delete document.body.dataset.battleState;
    }
  });

  beforeEach(() => {
    bus = { emit: vi.fn() };
    virtualTime = 0;
    nextTimeoutId = 0;
    creationOrder = 0;
    pendingTimeouts = new Map();
    scheduler = {
      setTimeout: vi.fn((fn, ms) => {
        const delay = Number(ms) || 0;
        const id = ++nextTimeoutId;
        pendingTimeouts.set(id, {
          fn,
          due: virtualTime + Math.max(0, delay),
          created: ++creationOrder
        });
        return id;
      }),
      clearTimeout: vi.fn((id) => {
        if (id == null) {
          return false;
        }
        return pendingTimeouts.delete(id);
      })
    };
    flushScheduler = async (limit = 50) => {
      let iterations = 0;
      let firstError;
      while (pendingTimeouts.size) {
        iterations += 1;
        if (iterations > limit) {
          throw new Error("flushScheduler exceeded iteration limit");
        }
        const tasks = [...pendingTimeouts.entries()].sort(([, a], [, b]) => {
          if (a.due !== b.due) {
            return a.due - b.due;
          }
          return a.created - b.created;
        });
        for (const [id, task] of tasks) {
          if (!pendingTimeouts.has(id)) {
            continue;
          }
          const advanceBy = task.due - virtualTime;
          if (advanceBy > 0) {
            vi.advanceTimersByTime(advanceBy);
            virtualTime += advanceBy;
          }
          pendingTimeouts.delete(id);
          try {
            const result = task.fn();
            if (result && typeof result.then === "function") {
              await result;
            }
          } catch (error) {
            if (!firstError) {
              firstError = error;
            }
          }
        }
      }
      if (firstError) {
        throw firstError;
      }
    };
  });

  it("emits countdown started and resolves ready at expiry", async () => {
    const showSnackbar = vi.fn();
    const dispatchBattleEvent = vi.fn();
    const controls = roundManager.startCooldown({}, scheduler, {
      eventBus: bus,
      showSnackbar,
      dispatchBattleEvent,
      // Force non-orchestrated path to mark button ready too
      isOrchestrated: () => false
    });

    // Countdown should be announced
    expect(bus.emit).toHaveBeenCalledWith("control.countdown.started", expect.any(Object));

    // Fast-forward timers to ensure expiry triggers
    await vi.runAllTimersAsync();
    await flushScheduler();
    await new Promise((resolve) => process.nextTick(resolve));
    // Ready promise should be present
    expect(controls).toBeTruthy();
    expect(typeof controls.ready?.then).toBe("function");
    await expect(controls.ready).resolves.toBeUndefined();
  });

  it("skips cancelled timers when flushing scheduler", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const firstId = scheduler.setTimeout(first, 100);
    const secondId = scheduler.setTimeout(second, 200);

    expect(scheduler.clearTimeout(firstId)).toBe(true);
    expect(scheduler.clearTimeout(null)).toBe(false);

    await flushScheduler();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    // Second timer should still be cleared from the pending map
    expect(pendingTimeouts.has(secondId)).toBe(false);
  });
});
