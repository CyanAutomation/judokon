import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/config/settingsDefaults.js";
import { loadSettings, saveSettings } from "../../src/helpers/settingsStorage.js";
import { getFeatureFlag, getSetting, resetCache } from "../../src/helpers/settingsCache.js";

/**
 * @fileoverview
 * Unit tests for settings helper functions.
 * Covers loading, saving, and cache access for settings in localStorage.
 */

describe("settings utils", () => {
  /** Save original setItem to restore after tests */
  const originalSetItem = Storage.prototype.setItem;
  /** Cache original localStorage to restore after all tests */
  const originalLocalStorage = global.localStorage;

  beforeEach(() => {
    resetCache();
    if (global.localStorage) {
      global.localStorage.clear();
    }
  });

  afterEach(() => {
    if (global.localStorage) {
      global.localStorage.clear();
    }
    Object.defineProperty(global, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
      writable: true
    });
    Storage.prototype.setItem = originalSetItem;
  });

  /**
   * Should load default settings when localStorage is empty.
   */
  it("loads defaults when storage is empty", async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  /**
   * Should retain default feature flags when partially loading from storage.
   */
  it("retains default feature flags on partial load", async () => {
    localStorage.setItem(
      "settings",
      JSON.stringify({ featureFlags: { enableTestMode: { enabled: true } } })
    );
    const settings = await loadSettings();
    expect(settings.featureFlags.enableCardInspector).toEqual(
      DEFAULT_SETTINGS.featureFlags.enableCardInspector
    );
    expect(settings.featureFlags.enableTestMode.enabled).toBe(true);
  });

  /**
   * Should save settings to localStorage.
   */
  it("saves settings", async () => {
    const data = {
      ...DEFAULT_SETTINGS,
      sound: false,
      displayMode: "dark"
    };
    await saveSettings(data);
    expect(JSON.parse(localStorage.getItem("settings"))).toEqual(data);
  });

  it("rejects if localStorage is unavailable", async () => {
    const original = global.localStorage;
    // Simulate localStorage being undefined
    Object.defineProperty(global, "localStorage", { value: undefined, configurable: true });
    await expect(saveSettings({ ...DEFAULT_SETTINGS, sound: true })).rejects.toThrow(
      "localStorage unavailable"
    );
    await expect(loadSettings()).rejects.toThrow();
    Object.defineProperty(global, "localStorage", { value: original, configurable: true });
  });

  it("returns defaults if localStorage.getItem returns null", async () => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => null);
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    Storage.prototype.getItem = originalGetItem;
  });

  /**
   * Should reset to defaults if settings JSON is invalid.
   */
  it("recovers from invalid stored JSON", async () => {
    localStorage.setItem("settings", "{bad json}");
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem("settings")).toBeNull();
    debugSpy.mockRestore();
  });

  /**
   * Should reject when localStorage.setItem throws.
   */
  it("rejects when localStorage.setItem throws", async () => {
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error("fail");
    });
    await expect(saveSettings(DEFAULT_SETTINGS)).rejects.toThrow("fail");
  });

  it("provides synchronous access via getSetting", async () => {
    localStorage.setItem("settings", JSON.stringify({ ...DEFAULT_SETTINGS, sound: false }));
    await loadSettings();
    expect(getSetting("sound")).toBe(false);
    localStorage.setItem("settings", JSON.stringify({ ...DEFAULT_SETTINGS, sound: true }));
    expect(getSetting("sound")).toBe(false);
  });

  it("retrieves feature flags via getFeatureFlag", async () => {
    localStorage.setItem(
      "settings",
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        featureFlags: { enableTestMode: { enabled: true } }
      })
    );
    await loadSettings();
    expect(getFeatureFlag("enableTestMode")).toBe(true);
    expect(getFeatureFlag("nonexistent")).toBe(false);
  });
});
