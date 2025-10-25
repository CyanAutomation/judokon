import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withFrameBudget } from "../../src/utils/rafUtils.js";

describe("withFrameBudget", () => {
  let originalRaf;

  beforeEach(() => {
    originalRaf = globalThis.requestAnimationFrame;
  });

  afterEach(() => {
    if (originalRaf) {
      globalThis.requestAnimationFrame = originalRaf;
    } else {
      delete globalThis.requestAnimationFrame;
    }
    vi.restoreAllMocks();
  });

  it("does not call workFn again once work is complete", () => {
    const nowSpy = vi.spyOn(performance, "now").mockImplementation(() => 0);
    const rafSpy = vi.fn();
    globalThis.requestAnimationFrame = rafSpy;

    const workFn = vi.fn().mockReturnValueOnce(false);

    withFrameBudget(workFn, 5);

    expect(workFn).toHaveBeenCalledTimes(1);
    expect(rafSpy).not.toHaveBeenCalled();

    nowSpy.mockRestore();
  });
});
