import { describe, it, expect, vi } from "vitest";

const TIMER_UTILS_PATH = "../../src/helpers/timerUtils.js";

describe("TimerController fallback countdown", () => {
  it("delegates every timeout to the injected scheduler", async () => {
    vi.resetModules();
    vi.doMock(TIMER_UTILS_PATH, () => ({
      getDefaultTimer: vi.fn(async () => 2)
    }));

    const { TimerController } = await import("../../src/helpers/TimerController.js");

    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const forbiddenSetTimeout = vi.fn(() => {
      throw new Error("global setTimeout should not be used by fallback countdown");
    });
    const forbiddenClearTimeout = vi.fn(() => {
      throw new Error("global clearTimeout should not be used by fallback countdown");
    });
    globalThis.setTimeout = forbiddenSetTimeout;
    globalThis.clearTimeout = forbiddenClearTimeout;

    const scheduled = new Map();
    let nextId = 0;
    const scheduler = {
      setTimeout: vi.fn((cb, delay) => {
        const id = ++nextId;
        scheduled.set(id, { cb, delay });
        return id;
      }),
      clearTimeout: vi.fn((id) => {
        scheduled.delete(id);
      })
    };

    const controller = new TimerController({
      scheduler,
      onSecondTick: () => 0,
      cancel: () => {}
    });

    const ticks = [];
    const onExpired = vi.fn();

    try {
      await controller.startRound(
        (remaining) => {
          ticks.push(remaining);
        },
        onExpired,
        2
      );

      expect(scheduler.setTimeout).toHaveBeenCalledTimes(1);
      expect(scheduler.setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000);
      expect(forbiddenSetTimeout).not.toHaveBeenCalled();

      const firstEntry = scheduled.entries().next().value;
      expect(firstEntry).toBeDefined();
      const [firstId, firstTask] = firstEntry;
      expect(firstTask.delay).toBe(1000);
      scheduled.delete(firstId);
      firstTask.cb();

      expect(ticks).toEqual([2, 1]);
      expect(scheduler.setTimeout).toHaveBeenCalledTimes(2);
      expect(forbiddenSetTimeout).not.toHaveBeenCalled();

      const secondEntry = scheduled.entries().next().value;
      expect(secondEntry).toBeDefined();
      const [secondId, secondTask] = secondEntry;
      expect(secondTask.delay).toBe(1000);
      scheduled.delete(secondId);
      secondTask.cb();

      expect(ticks).toEqual([2, 1, 0]);
      expect(scheduler.clearTimeout).toHaveBeenCalledTimes(1);
      expect(scheduler.clearTimeout).toHaveBeenCalledWith(secondId);
      expect(forbiddenSetTimeout).not.toHaveBeenCalled();
      expect(forbiddenClearTimeout).not.toHaveBeenCalled();
      expect(onExpired).toHaveBeenCalledTimes(1);
      expect(scheduled.size).toBe(0);
    } finally {
      controller.stop();
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
      vi.doUnmock(TIMER_UTILS_PATH);
      vi.resetModules();
    }
  });

  it("pauses when the document becomes hidden and resumes when visible", async () => {
    vi.resetModules();
    vi.doMock(TIMER_UTILS_PATH, () => ({
      getDefaultTimer: vi.fn(async () => 2)
    }));

    const { TimerController } = await import("../../src/helpers/TimerController.js");

    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;

    const forbiddenSetTimeout = vi.fn(() => {
      throw new Error("global setTimeout should not be used by fallback countdown");
    });
    const forbiddenClearTimeout = vi.fn(() => {
      throw new Error("global clearTimeout should not be used by fallback countdown");
    });

    globalThis.setTimeout = forbiddenSetTimeout;
    globalThis.clearTimeout = forbiddenClearTimeout;

    const scheduled = new Map();
    let nextId = 0;
    const scheduler = {
      setTimeout: vi.fn((cb, delay) => {
        const id = ++nextId;
        scheduled.set(id, { cb, delay });
        return id;
      }),
      clearTimeout: vi.fn((id) => {
        scheduled.delete(id);
      })
    };

    const controller = new TimerController({
      scheduler,
      onSecondTick: () => 0,
      cancel: () => {}
    });

    const ticks = [];
    const onExpired = vi.fn();

    let hiddenState = false;
    const originalDescriptor = Object.getOwnPropertyDescriptor(document, "hidden");
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hiddenState
    });

    try {
      await controller.startRound(
        (remaining) => {
          ticks.push(remaining);
        },
        onExpired,
        2
      );

      expect(scheduler.setTimeout).toHaveBeenCalledTimes(1);

      const firstEntry = scheduled.entries().next().value;
      expect(firstEntry).toBeDefined();
      const [firstId, firstTask] = firstEntry;
      expect(firstTask.delay).toBe(1000);
      scheduled.delete(firstId);
      firstTask.cb();

      expect(ticks).toEqual([2, 1]);
      expect(scheduler.setTimeout).toHaveBeenCalledTimes(2);

      const secondEntry = scheduled.entries().next().value;
      expect(secondEntry).toBeDefined();
      const [secondId, secondTask] = secondEntry;
      expect(secondTask.delay).toBe(1000);

      hiddenState = true;
      document.dispatchEvent(new Event("visibilitychange"));

      expect(scheduler.clearTimeout).toHaveBeenCalledWith(secondId);
      expect(scheduled.size).toBe(0);

      hiddenState = false;
      document.dispatchEvent(new Event("visibilitychange"));

      expect(scheduler.setTimeout).toHaveBeenCalledTimes(3);
      const resumeEntry = scheduled.entries().next().value;
      expect(resumeEntry).toBeDefined();
      const [resumedId, resumedTask] = resumeEntry;
      expect(resumedTask.delay).toBe(1000);

      scheduled.delete(resumedId);
      resumedTask.cb();

      expect(ticks).toEqual([2, 1, 0]);
      expect(onExpired).toHaveBeenCalledTimes(1);
      expect(scheduler.clearTimeout).toHaveBeenCalledWith(resumedId);
    } finally {
      controller.stop();
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
      if (originalDescriptor) {
        Object.defineProperty(document, "hidden", originalDescriptor);
      } else {
        Reflect.deleteProperty(document, "hidden");
      }
      vi.doUnmock(TIMER_UTILS_PATH);
      vi.resetModules();
    }
  });
});
