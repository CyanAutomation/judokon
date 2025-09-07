import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runWhenIdle } from "../../../src/helpers/classicBattle/idleCallback.js";

describe("runWhenIdle", () => {
  let originalRic;
  let originalSt;
  let originalQm;

  beforeEach(() => {
    originalRic = window.requestIdleCallback;
    originalSt = window.setTimeout;
    originalQm = globalThis.queueMicrotask;
  });

  afterEach(() => {
    window.requestIdleCallback = originalRic;
    window.setTimeout = originalSt;
    globalThis.queueMicrotask = originalQm;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses requestIdleCallback with timeout fallback", () => {
    const fn = vi.fn();
    const ric = vi.fn((cb) => {
      cb();
      return 1;
    });
    const st = vi.fn();
    window.requestIdleCallback = ric;
    window.setTimeout = st;
    runWhenIdle(fn);
    expect(ric).toHaveBeenCalledWith(fn);
    expect(st).toHaveBeenCalledTimes(1);
    expect(st.mock.calls[0][1]).toBe(2000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("falls back to queueMicrotask when idle callback missing", () => {
    const fn = vi.fn();
    const qm = vi.fn((cb) => cb());
    delete window.requestIdleCallback;
    globalThis.queueMicrotask = qm;
    runWhenIdle(fn);
    expect(qm).toHaveBeenCalledWith(fn);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
