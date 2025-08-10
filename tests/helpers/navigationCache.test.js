/** @jest-environment jsdom */
// @vitest-environment jsdom
import { load, save, reset } from "../../src/helpers/navigationCache.js";
import { getItem, setItem, removeItem } from "../../src/helpers/storage.js";

const mockFn = () => (globalThis.jest || globalThis.vi).fn();

const validItems = [
  {
    id: 1,
    gameModeId: 1,
    url: "pages/test.html",
    category: "mainMenu",
    order: 1,
    isHidden: false
  }
];

describe("navigationCache", () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    removeItem("navigationItems");
    global.fetch = mockFn().mockRejectedValue(new Error("fail"));
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("reset clears persisted items", async () => {
    await save(validItems);
    expect(getItem("navigationItems")).not.toBeNull();
    reset();
    expect(getItem("navigationItems")).toBeNull();
  });

  test("save rejects invalid data", async () => {
    await expect(save([{ id: 1 }])).rejects.toThrow();
  });

  test("load removes invalid stored data", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      setItem("navigationItems", [{ id: 1 }]);
      const items = await load();
      expect(Array.isArray(items)).toBe(true);
      expect(getItem("navigationItems")).not.toEqual([{ id: 1 }]);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
