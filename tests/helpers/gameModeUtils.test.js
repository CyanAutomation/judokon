import { describe, it, expect, vi } from "vitest";
import navFallback from "../../src/data/navigationItems.js";

describe("loadNavigationItems", () => {
  it("returns static fallback when cache and import fail", async () => {
    vi.resetModules();
    vi.doMock("../../src/helpers/navigationCache.js", () => ({
      load: vi.fn().mockRejectedValue(new Error("cache fail")),
      save: vi.fn()
    }));
    const mod = await import("../../src/helpers/gameModeUtils.js");
    vi.spyOn(mod, "loadGameModes").mockResolvedValue([]);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await mod.loadNavigationItems();
    expect(result).toEqual(navFallback);
    consoleError.mockRestore();
  });
});
