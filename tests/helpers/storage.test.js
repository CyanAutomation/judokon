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

    setItem(key, value);

    expect(getItem(key)).toEqual(value);
  });

  it("falls back to memory when localStorage returns null after a prior failure", () => {
    const key = "storage:test:fallback-read";
    const value = { message: "memory" };
    usedKeys.add(key);

    const setSpy = vi.spyOn(window.localStorage, "setItem");
    setSpy.mockImplementationOnce(() => {
      throw new Error("quota exceeded");
    });

    setItem(key, value);

    setSpy.mockImplementation(() => {});

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
