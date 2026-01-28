import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveSettings, loadSettings } from "../../src/helpers/settingsStorage.js";
import { getCachedSettings, resetCache } from "../../src/helpers/settingsCache.js";
import { DEFAULT_SETTINGS } from "../../src/config/settingsDefaults.js";

/**
 * @vitest-environment jsdom
 */

describe("settingsStorage", () => {
  beforeEach(() => {
    resetCache();
    localStorage.clear();
  });

  it("persists settings and updates the cache", async () => {
    const nextSettings = { ...DEFAULT_SETTINGS, sound: false };

    await saveSettings(nextSettings);

    expect(JSON.parse(localStorage.getItem("settings"))).toEqual(nextSettings);
    expect(getCachedSettings()).toEqual(nextSettings);
  });

  it("rejects when localStorage is unavailable but still updates the cache", async () => {
    const originalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: undefined,
      configurable: true
    });

    const nextSettings = { ...DEFAULT_SETTINGS, motionEffects: false };

    await expect(saveSettings(nextSettings)).rejects.toThrow("localStorage unavailable");
    expect(getCachedSettings()).toEqual(nextSettings);

    Object.defineProperty(globalThis, "localStorage", {
      value: originalStorage,
      configurable: true
    });
  });

  it("loads defaults when storage is empty", async () => {
    const settings = await loadSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(getCachedSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("clears invalid stored JSON and restores defaults", async () => {
    localStorage.setItem("settings", "{bad json}");
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const settings = await loadSettings();

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem("settings")).toBeNull();
    debugSpy.mockRestore();
  });

  it("rejects invalid schema on save", async () => {
    const invalid = { ...DEFAULT_SETTINGS, unknownSetting: true };

    await expect(saveSettings(invalid)).rejects.toThrow("Schema validation failed");
  });
});
