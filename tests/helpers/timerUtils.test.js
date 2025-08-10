// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("timerUtils", () => {
  it("returns the default timer for a category", async () => {
    const data = [
      { id: 1, value: 10, default: false, category: "roundTimer" },
      { id: 2, value: 20, default: true, category: "roundTimer" }
    ];
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(data),
      importJsonModule: vi.fn()
    }));
    const { getDefaultTimer } = await import("../../src/helpers/timerUtils.js");
    const val1 = await getDefaultTimer("roundTimer");
    const val2 = await getDefaultTimer("roundTimer");
    expect(val1).toBe(20);
    expect(val2).toBe(20);
  });

  it("falls back to import when fetch fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fallback = [{ id: 3, value: 5, default: true, category: "coolDownTimer" }];
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockRejectedValue(new Error("fail")),
      importJsonModule: vi.fn().mockResolvedValue(fallback)
    }));
    const { getDefaultTimer } = await import("../../src/helpers/timerUtils.js");
    const val = await getDefaultTimer("coolDownTimer");
    expect(val).toBe(5);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
