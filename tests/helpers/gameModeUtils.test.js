import { describe, it, expect, vi } from "vitest";
import navFallback from "../../src/data/navigationItems.js";

describe("loadNavigationItems", () => {
  it("returns static fallback when cache and import fail", async () => {
    vi.resetModules();
    // Fail navigation cache load to force fallback to bundled navigationItems
    vi.doMock("../../src/helpers/navigationCache.js", () => ({
      load: vi.fn().mockRejectedValue(new Error("cache fail")),
      save: vi.fn()
    }));
    // Make gameModes loading resolve to an empty array regardless of fetch/import
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockRejectedValue(new Error("fetch fail")),
      validateWithSchema: vi.fn().mockResolvedValue(),
      importJsonModule: vi.fn().mockResolvedValue([])
    }));
    const mod = await import("../../src/helpers/gameModeUtils.js");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await mod.loadNavigationItems();
    expect(result).toEqual(navFallback);
    consoleError.mockRestore();
  });
});
