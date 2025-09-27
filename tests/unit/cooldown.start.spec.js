import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as roundManager from "@/helpers/classicBattle/roundManager.js";

describe("cooldown auto-advance wiring", () => {
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

  it("emits countdown started and resolves ready at expiry", async () => {
    const bus = { emit: vi.fn() };
    let virtualTime = 0;
    let nextTimeoutId = 0;
    const pendingTimeouts = new Map();
    const scheduler = {
      setTimeout: vi.fn((fn, ms) => {
        const delay = Number(ms) || 0;
        const id = ++nextTimeoutId;
        pendingTimeouts.set(id, { fn, due: virtualTime + Math.max(0, delay) });
        return id;
      }),
      clearTimeout: vi.fn((id) => {
        pendingTimeouts.delete(id);
      })
    };
    const flushScheduler = async (limit = 50) => {
      let iterations = 0;
      while (pendingTimeouts.size) {
        iterations += 1;
        if (iterations > limit) {
          throw new Error("flushScheduler exceeded iteration limit");
        }
        const tasks = [...pendingTimeouts.entries()].sort(([, a], [, b]) => a.due - b.due);
        pendingTimeouts.clear();
        for (const [, task] of tasks) {
          const advanceBy = task.due - virtualTime;
          if (advanceBy > 0) {
            vi.advanceTimersByTime(advanceBy);
            virtualTime += advanceBy;
          }
          const result = task.fn();
          if (result && typeof result.then === "function") {
            await result;
          }
        }
      }
    };
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
});
