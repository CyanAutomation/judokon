import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { runWhenIdle } from "../../../src/helpers/classicBattle/idleCallback.js";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { installIdleCallbackMock } from "../idleCallbackMock.js";

describe("runWhenIdle", () => {
  let timers;
  let idleControl;

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    idleControl?.restore();
    idleControl = undefined;
    if (timers) {
      timers.cleanup();
      timers = undefined;
    } else {
      vi.useRealTimers();
    }
    vi.restoreAllMocks();
  });

  it("runs idle work after microtasks and before the timeout fallback", async () => {
    timers = useCanonicalTimers();
    vi.setSystemTime(0);
    idleControl = installIdleCallbackMock();

    const fallbackSpy = vi.spyOn(window, "setTimeout");
    const events = [];

    const target = document.createElement("div");
    document.body.appendChild(target);

    const fn = vi.fn(() => {
      events.push("idle");
      target.dataset.state = "ready";
    });

    runWhenIdle(fn);
    events.push("sync");
    queueMicrotask(() => events.push("microtask"));

    await Promise.resolve();

    const invocation = idleControl.flushNext({ timeRemaining: 12 });

    expect(invocation).not.toBeNull();
    expect(invocation?.deadline.didTimeout).toBe(false);
    expect(invocation?.deadline.timeRemaining()).toBe(12);
    expect(invocation?.elapsed).toBeGreaterThanOrEqual(0);
    expect(invocation?.elapsed).toBeLessThan(2000);

    expect(events).toEqual(["sync", "microtask", "idle"]);
    expect(target.dataset.state).toBe("ready");
    expect(idleControl.getScheduledCount()).toBe(0);
    expect(fallbackSpy).toHaveBeenCalledTimes(1);
    expect(fallbackSpy.mock.calls[0][1]).toBe(2000);
    expect(fn).toHaveBeenCalledTimes(1);

    await timers.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("uses the timeout fallback when idle never fires to preserve responsiveness", async () => {
    timers = useCanonicalTimers();
    vi.setSystemTime(0);
    idleControl = installIdleCallbackMock();

    const fallbackSpy = vi.spyOn(window, "setTimeout");
    const start = Date.now();
    let finishTime = null;

    const fn = vi.fn(() => {
      finishTime = Date.now();
    });

    runWhenIdle(fn);

    const scheduledId = idleControl.requestIdleCallback.mock.results[0]?.value;
    expect(scheduledId).toBeTruthy();
    expect(idleControl.getScheduledCount()).toBe(1);

    expect(fallbackSpy).toHaveBeenCalledTimes(1);
    expect(fallbackSpy.mock.calls[0][1]).toBe(2000);

    await timers.advanceTimersByTimeAsync(1999);
    expect(fn).not.toHaveBeenCalled();
    expect(finishTime).toBeNull();
    expect(idleControl.getScheduledCount()).toBe(1);

    await timers.advanceTimersByTimeAsync(1);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(idleControl.cancelIdleCallback).toHaveBeenCalledWith(scheduledId);
    expect(idleControl.getScheduledCount()).toBe(0);
    expect(finishTime).toBe(start + 2000);
  });

  it("falls back to queueMicrotask when idle callback is missing", () => {
    const fn = vi.fn();
    const qm = vi.fn((cb) => cb());

    const originalRequestIdleCallback = window.requestIdleCallback;
    const originalQueueMicrotask = globalThis.queueMicrotask;

    delete window.requestIdleCallback;
    globalThis.queueMicrotask = qm;

    try {
      runWhenIdle(fn);
      expect(qm).toHaveBeenCalledWith(fn);
      expect(fn).toHaveBeenCalledTimes(1);
    } finally {
      if (originalRequestIdleCallback === undefined) {
        delete window.requestIdleCallback;
      } else {
        window.requestIdleCallback = originalRequestIdleCallback;
      }
      globalThis.queueMicrotask = originalQueueMicrotask;
    }
  });
});
