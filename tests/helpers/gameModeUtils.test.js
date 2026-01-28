import { describe, it, expect, vi } from "vitest";
import navFallback from "../../src/data/navigationItems.js";
import navFixture from "../fixtures/navigationItems.js";
import gameModesFixture from "../fixtures/gameModes.json" with { type: "json" };

// ===== Top-level vi.hoisted() for shared mock state =====
const {
  mockFetchJson,
  mockValidateWithSchema,
  mockImportJsonModule,
  mockGetItem,
  mockSetItem,
  mockRemoveItem
} = vi.hoisted(() => ({
  mockFetchJson: vi.fn().mockResolvedValue([]),
  mockValidateWithSchema: vi.fn().mockResolvedValue(),
  mockImportJsonModule: vi.fn(),
  mockGetItem: vi.fn().mockReturnValue(null),
  mockSetItem: vi.fn(),
  mockRemoveItem: vi.fn()
}));

vi.mock("../../src/helpers/dataUtils.js", () => ({
  __esModule: true,
  fetchJson: mockFetchJson,
  validateWithSchema: mockValidateWithSchema,
  importJsonModule: mockImportJsonModule
}));

vi.mock("../../src/helpers/storage.js", () => ({
  __esModule: true,
  getItem: mockGetItem,
  setItem: mockSetItem,
  removeItem: mockRemoveItem
}));

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

    // Configure mocks for this test
    const fetchedGameModes = cloneGameModes();
    mockFetchJson.mockResolvedValue(fetchedGameModes);
    mockValidateWithSchema.mockResolvedValue();
    mockImportJsonModule.mockClear();

    mockGetItem.mockImplementation((key) =>
      key === "navigationItems" ? navSubset : null
    );
    mockSetItem.mockClear();
    mockRemoveItem.mockClear();

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
      expect(mockGetItem).toHaveBeenCalledTimes(2);
      expect(mockGetItem).toHaveBeenNthCalledWith(1, "navigationItems");
      expect(mockGetItem).toHaveBeenNthCalledWith(2, "gameModes");
      expect(mockFetchJson).toHaveBeenCalledTimes(1);
      expect(mockSetItem).toHaveBeenCalledTimes(1);
      const [savedKey, savedValue] = mockSetItem.mock.calls[0];
      expect(savedKey).toBe("gameModes");
      expect(savedValue).toEqual(fetchedGameModes);
      expect(mockValidateWithSchema).not.toHaveBeenCalled();
      expect(mockImportJsonModule).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it("falls back to bundled navigation items when cache load fails and reuses cached game modes", async () => {
    vi.resetModules();
    const navSubset = navFixture.slice(0, 2).map((item) => ({ ...item }));
    const cacheError = new Error("cache fail");

    // Configure mocks for this test
    const fetchedGameModes = cloneGameModes();
    mockFetchJson.mockReset().mockResolvedValue(fetchedGameModes);
    mockValidateWithSchema.mockReset().mockResolvedValue();
    mockImportJsonModule.mockReset();

    let gameModeCalls = 0;
    mockGetItem.mockReset().mockImplementation((key) => {
      if (key === "navigationItems") {
        throw cacheError;
      }
      if (key === "gameModes") {
        gameModeCalls += 1;
        return gameModeCalls === 1 ? null : fetchedGameModes;
      }
      return null;
    });
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();

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
      expect(mockSetItem).toHaveBeenCalledTimes(1);
      const [savedKey, savedValue] = mockSetItem.mock.calls[0];
      expect(savedKey).toBe("gameModes");
      expect(savedValue).toEqual(fetchedGameModes);
      expect(mockFetchJson).toHaveBeenCalledTimes(1);
      expect(mockGetItem).toHaveBeenCalledTimes(2);
      expect(mockRemoveItem).not.toHaveBeenCalled();

      mockGetItem.mockImplementation((key) =>
        key === "navigationItems" ? navSubset : fetchedGameModes
      );
      const secondResult = await mod.loadNavigationItems();
      expect(secondResult.map((item) => item.id)).toEqual(navSubset.map((item) => item.id));
      const expectedSecondNames = navSubset.map((item) => {
        const mode = fetchedGameModes.find((gm) => gm.id === item.gameModeId);
        return mode?.name;
      });
      expect(secondResult.map((item) => item.name)).toEqual(expectedSecondNames);
      expect(mockFetchJson).toHaveBeenCalledTimes(1);
      expect(mockGetItem).toHaveBeenCalledTimes(4);
      expect(mockValidateWithSchema).toHaveBeenCalledTimes(1);
      expect(mockImportJsonModule).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
      restore();
    }
  });
});
