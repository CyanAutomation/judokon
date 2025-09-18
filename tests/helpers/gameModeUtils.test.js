import { describe, it, expect, vi } from "vitest";
import navFallback from "../../src/data/navigationItems.js";
import navFixture from "../fixtures/navigationItems.js";
import gameModesFixture from "../fixtures/gameModes.json" with { type: "json" };

function cloneGameModes() {
  return JSON.parse(JSON.stringify(gameModesFixture));
}

function setupSchemaFetch(schema = { type: "array" }) {
  const originalFetch = global.fetch;
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => schema
  });
  global.fetch = fetchMock;
  return {
    fetchMock,
    restore() {
      global.fetch = originalFetch;
    }
  };
}

describe("loadNavigationItems", () => {
  it("merges cached navigation items with fetched game modes and caches the result", async () => {
    vi.resetModules();
    const navSubset = navFixture.slice(0, 3).map((item) => ({ ...item }));
    const navigationCacheLoad = vi.fn().mockResolvedValue(navSubset);
    const navigationCacheSave = vi.fn();
    vi.doMock("../../src/helpers/navigationCache.js", () => ({
      __esModule: true,
      load: navigationCacheLoad,
      save: navigationCacheSave
    }));
    const fetchedGameModes = cloneGameModes();
    const fetchJson = vi.fn().mockResolvedValue(fetchedGameModes);
    const validateWithSchema = vi.fn().mockResolvedValue();
    const importJsonModule = vi.fn();
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      __esModule: true,
      fetchJson,
      validateWithSchema,
      importJsonModule
    }));
    const getItem = vi.fn().mockReturnValue(null);
    const setItem = vi.fn();
    const removeItem = vi.fn();
    vi.doMock("../../src/helpers/storage.js", () => ({
      __esModule: true,
      getItem,
      setItem,
      removeItem
    }));
    const { fetchMock, restore } = setupSchemaFetch();
    try {
      const mod = await import("../../src/helpers/gameModeUtils.js");
      const result = await mod.loadNavigationItems();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(navSubset.length);
      expect(result.map((item) => item.id)).toEqual(navSubset.map((item) => item.id));
      const expectedNames = navSubset.map((item) => {
        const mode = fetchedGameModes.find((gm) => gm.id === item.gameModeId);
        return mode?.name;
      });
      expect(result.map((item) => item.name)).toEqual(expectedNames);
      expect(result[0]).toMatchObject({
        id: navSubset[0].id,
        url: navSubset[0].url,
        category: navSubset[0].category,
        order: navSubset[0].order,
        isHidden: navSubset[0].isHidden,
        name: expectedNames[0],
        description: fetchedGameModes.find((gm) => gm.id === navSubset[0].gameModeId)?.description
      });
      expect(navigationCacheLoad).toHaveBeenCalledTimes(1);
      expect(navigationCacheSave).not.toHaveBeenCalled();
      expect(getItem).toHaveBeenCalledTimes(1);
      expect(fetchJson).toHaveBeenCalledTimes(1);
      expect(setItem).toHaveBeenCalledTimes(1);
      const [savedKey, savedValue] = setItem.mock.calls[0];
      expect(savedKey).toBe("gameModes");
      expect(savedValue).toEqual(fetchedGameModes);
      expect(validateWithSchema).not.toHaveBeenCalled();
      expect(importJsonModule).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it("falls back to bundled navigation items when cache load fails and reuses cached game modes", async () => {
    vi.resetModules();
    const navSubset = navFixture.slice(0, 2).map((item) => ({ ...item }));
    const cacheError = new Error("cache fail");
    const navigationCacheLoad = vi
      .fn()
      .mockRejectedValueOnce(cacheError)
      .mockResolvedValue(navSubset);
    const navigationCacheSave = vi.fn();
    vi.doMock("../../src/helpers/navigationCache.js", () => ({
      __esModule: true,
      load: navigationCacheLoad,
      save: navigationCacheSave
    }));
    const fetchedGameModes = cloneGameModes();
    const fetchJson = vi.fn().mockResolvedValue(fetchedGameModes);
    const validateWithSchema = vi.fn().mockResolvedValue();
    const importJsonModule = vi.fn();
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      __esModule: true,
      fetchJson,
      validateWithSchema,
      importJsonModule
    }));
    const getItem = vi.fn().mockReturnValueOnce(null).mockReturnValue(fetchedGameModes);
    const setItem = vi.fn();
    const removeItem = vi.fn();
    vi.doMock("../../src/helpers/storage.js", () => ({
      __esModule: true,
      getItem,
      setItem,
      removeItem
    }));
    const { fetchMock, restore } = setupSchemaFetch();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const mod = await import("../../src/helpers/gameModeUtils.js");
      const firstResult = await mod.loadNavigationItems();
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to load navigationItems from cache:",
        cacheError
      );
      expect(firstResult.map((item) => item.id)).toEqual(navFallback.map((item) => item.id));
      const fallbackNames = navFallback.map((item) => {
        const mode = fetchedGameModes.find((gm) => gm.id === item.gameModeId);
        return mode?.name;
      });
      expect(firstResult.map((item) => item.name)).toEqual(fallbackNames);
      expect(setItem).toHaveBeenCalledTimes(1);
      const [savedKey, savedValue] = setItem.mock.calls[0];
      expect(savedKey).toBe("gameModes");
      expect(savedValue).toEqual(fetchedGameModes);
      expect(fetchJson).toHaveBeenCalledTimes(1);
      expect(getItem).toHaveBeenCalledTimes(1);
      expect(removeItem).not.toHaveBeenCalled();

      const secondResult = await mod.loadNavigationItems();
      expect(navigationCacheLoad).toHaveBeenCalledTimes(2);
      expect(secondResult.map((item) => item.id)).toEqual(navSubset.map((item) => item.id));
      const expectedSecondNames = navSubset.map((item) => {
        const mode = fetchedGameModes.find((gm) => gm.id === item.gameModeId);
        return mode?.name;
      });
      expect(secondResult.map((item) => item.name)).toEqual(expectedSecondNames);
      expect(fetchJson).toHaveBeenCalledTimes(1);
      expect(getItem).toHaveBeenCalledTimes(2);
      expect(validateWithSchema).toHaveBeenCalledTimes(1);
      expect(navigationCacheSave).not.toHaveBeenCalled();
      expect(importJsonModule).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
      restore();
    }
  });
});
