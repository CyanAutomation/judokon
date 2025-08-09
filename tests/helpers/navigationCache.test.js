/** @jest-environment jsdom */
// @vitest-environment jsdom
import { load, save, reset } from "../../src/helpers/navigationCache.js";

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
    localStorage.clear();
    global.fetch = mockFn().mockRejectedValue(new Error("fail"));
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("reset clears persisted items", async () => {
    await save(validItems);
    expect(localStorage.getItem("navigationItems")).not.toBeNull();
    reset();
    expect(localStorage.getItem("navigationItems")).toBeNull();
  });

  test("save rejects invalid data", async () => {
    await expect(save([{ id: 1 }])).rejects.toThrow();
  });

  test("load removes invalid stored data", async () => {
    localStorage.setItem("navigationItems", '[{"id":1}]');
    const items = await load();
    expect(Array.isArray(items)).toBe(true);
    expect(localStorage.getItem("navigationItems")).not.toBe('[{"id":1}]');
  });
});
