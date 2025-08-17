// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import defaultSettings from "../../src/data/settings.json" with { type: "json" };

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
      importJsonModule: vi.fn().mockResolvedValue(defaultSettings)
    }));
    const { getDefaultTimer } = await import("../../src/helpers/timerUtils.js");
    const val1 = await getDefaultTimer("roundTimer");
    const val2 = await getDefaultTimer("roundTimer");
    expect(val1).toBe(20);
    expect(val2).toBe(20);
  });

  it("falls back to import when fetch fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const importMock = vi.fn().mockResolvedValue(defaultSettings);
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockRejectedValue(new Error("fail")),
      importJsonModule: importMock
    }));
    const { getDefaultTimer } = await import("../../src/helpers/timerUtils.js");
    await expect(getDefaultTimer("coolDownTimer")).rejects.toThrow();
    expect(importMock).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
