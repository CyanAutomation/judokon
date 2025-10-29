import { describe, it, expect, vi, afterEach } from "vitest";
import { rafDebounce, runAfterFrames } from "../../src/utils/rafUtils.js";

function flushAllFrames(queue) {
  // Simulate the browser advancing RAF callbacks in order until the queue is empty.
  while (queue.length > 0) {
    const callback = queue.shift();
    callback();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("rafDebounce", () => {
  it("schedules work on the next frame and cancels previous requests", () => {
    vi.stubEnv("VITEST", undefined);

    const rafCallbacks = [];
    const requestAnimationFrameStub = vi.fn((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    const cancelAnimationFrameStub = vi.fn();

    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameStub);
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrameStub);

    const fn = vi.fn();
    const debounced = rafDebounce(fn);

    debounced("first");
    debounced("second");

    expect(requestAnimationFrameStub).toHaveBeenCalledTimes(2);
    expect(cancelAnimationFrameStub).toHaveBeenCalledTimes(1);
    expect(cancelAnimationFrameStub).toHaveBeenCalledWith(1);
    expect(fn).not.toHaveBeenCalled();

    rafCallbacks[1]();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });

  it("executes immediately when running under Vitest", () => {
    vi.stubEnv("VITEST", "1");

    const requestAnimationFrameStub = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameStub);

    const fn = vi.fn();
    const debounced = rafDebounce(fn);

    debounced("instant");

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("instant");
    expect(requestAnimationFrameStub).not.toHaveBeenCalled();
  });
});

describe("runAfterFrames", () => {
  it("runs immediately when no frames are requested", () => {
    const requestAnimationFrameStub = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameStub);

    const fn = vi.fn();
    runAfterFrames(0, fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrameStub).not.toHaveBeenCalled();
  });

  it("waits for the specified number of frames before running", () => {
    const rafQueue = [];
    const requestAnimationFrameStub = vi.fn((cb) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });

    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameStub);

    const fn = vi.fn();
    runAfterFrames(3, fn);

    expect(fn).not.toHaveBeenCalled();
    expect(requestAnimationFrameStub).toHaveBeenCalledTimes(1);

    flushAllFrames(rafQueue);

    expect(requestAnimationFrameStub).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs immediately when given a negative frame count", () => {
    const requestAnimationFrameStub = vi.fn();
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameStub);

    const fn = vi.fn();
    runAfterFrames(-2, fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrameStub).not.toHaveBeenCalled();
  });
});
