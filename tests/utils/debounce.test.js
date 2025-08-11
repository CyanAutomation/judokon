import { describe, it, expect, vi } from "vitest";
import { debounce } from "../../src/utils/debounce.js";

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

  it("rejects previous promise when a new call is made", async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    const first = debounced("a");
    const second = debounced("b");
    await expect(first).rejects.toThrow("Debounced");
    vi.advanceTimersByTime(100);
    await expect(second).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b");
    vi.useRealTimers();
  });
});
