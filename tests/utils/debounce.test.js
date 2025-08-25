import { describe, it, expect, vi } from "vitest";
import { debounce, DebounceError } from "../../src/utils/debounce.js";

describe("debounce", () => {
  it("resolves with latest call after delay", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockReturnValue("done");
    const debounced = debounce(fn, 100);
    const promise = debounced("first");
    vi.advanceTimersByTime(100);
    await expect(promise).resolves.toBe("done");
    expect(fn).toHaveBeenCalledWith("first");
    vi.useRealTimers();
  });

  it("rejects previous promise with DebounceError by default", async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    const first = debounced("a");
    const second = debounced("b");
    await expect(first).rejects.toBeInstanceOf(DebounceError);
    vi.advanceTimersByTime(100);
    await expect(second).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b");
    vi.useRealTimers();
  });

  it("suppresses rejection and calls onCancel when configured", async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const onCancel = vi.fn();
    const debounced = debounce(fn, 100, {
      suppressRejection: true,
      onCancel
    });
    const first = debounced("a");
    const second = debounced("b");
    await expect(first).resolves.toBeUndefined();
    expect(onCancel).toHaveBeenCalledWith(expect.any(DebounceError));
    vi.advanceTimersByTime(100);
    await expect(second).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b");
    vi.useRealTimers();
  });

  it("flush runs pending work immediately", async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    const promise = debounced("a");
    debounced.flush();
    await expect(promise).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledWith("a");
  });
});
