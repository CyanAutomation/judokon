import { afterEach, describe, expect, it, vi } from "vitest";

import { getItem, removeItem, setItem } from "@/helpers/storage.js";

describe("storage fallback behavior", () => {
  const usedKeys = new Set();

  afterEach(() => {
    for (const key of usedKeys) {
      removeItem(key);
      window.localStorage.removeItem(key);
    }
    usedKeys.clear();
    vi.restoreAllMocks();
  });

  it("returns values stored in memory when localStorage write fails", () => {
    const key = "storage:test:fallback-write";
    const value = { message: "fallback" };
    usedKeys.add(key);

    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    vi.spyOn(window.localStorage, "getItem").mockReturnValue(null);

    setItem(key, value);

    expect(getItem(key)).toEqual(value);
  });

  it("retrieves memory-stored values when serialization fails", () => {
    const key = "storage:test:serialization";
    const value = {};
    value.self = value;
    usedKeys.add(key);

    setItem(key, value);

    expect(getItem(key)).toBe(value);
  });
});
