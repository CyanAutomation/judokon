import { describe, it, expect, vi } from "vitest";

describe("loadNavigationItems", () => {
  it("returns static fallback when cache and import fail", async () => {
    vi.resetModules();
    vi.doMock("../../src/helpers/navigationCache.js", () => ({
      load: vi.fn().mockRejectedValue(new Error("cache fail")),
      save: vi.fn()
    }));
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue([]),
      validateWithSchema: vi.fn(),
      importJsonModule: vi.fn(async (path) => {
        if (path.includes("navigationItems.json")) throw new Error("import fail");
        return [];
      })
    }));
    vi.doMock("../../src/helpers/storage.js", () => ({
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    }));
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { loadNavigationItems } = await import("../../src/helpers/gameModeUtils.js");
    const result = await loadNavigationItems();
    const { default: navFallback } = await import("../../src/data/navigationItems.json");
    expect(result).toEqual(navFallback);
    consoleError.mockRestore();
  });
});
