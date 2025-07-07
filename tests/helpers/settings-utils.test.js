import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

/**
 * @fileoverview
 * Unit tests for settingsUtils helper functions.
 * Covers loading, saving, updating, and error handling for settings in localStorage.
 */

describe("settings utils", () => {
  /** Save original setItem to restore after tests */
  const originalSetItem = Storage.prototype.setItem;

  beforeEach(() => {
    Storage.prototype.setItem = originalSetItem;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.resetModules();
    vi.useRealTimers();
  });

  /**
   * Should load default settings when localStorage is empty.
   */
  it("loads defaults when storage is empty", async () => {
    const { loadSettings } = await import("../../src/helpers/settingsUtils.js");
    const settings = await loadSettings();
    expect(settings).toEqual({
      sound: true,
      fullNavMap: true,
      motionEffects: true,
      displayMode: "light",
      gameModes: {}
    });
  });

  /**
   * Should debounce and save settings to localStorage.
   */
  it("saves settings with debounce", async () => {
    vi.useFakeTimers();
    const { saveSettings } = await import("../../src/helpers/settingsUtils.js");
    const data = {
      sound: false,
      fullNavMap: true,
      motionEffects: true,
      displayMode: "dark",
      gameModes: {}
    };
    const promise = saveSettings(data);
    await vi.advanceTimersByTimeAsync(110);
    await promise;
    expect(JSON.parse(localStorage.getItem("settings"))).toEqual(data);
  });

  it("does not throw if localStorage is unavailable", async () => {
    const original = global.localStorage;
    // Simulate localStorage being undefined
    Object.defineProperty(global, "localStorage", { value: undefined, configurable: true });
    const { saveSettings, loadSettings } = await import("../../src/helpers/settingsUtils.js");
    await expect(saveSettings({ sound: true })).rejects.toThrow();
    await expect(loadSettings()).rejects.toThrow();
    Object.defineProperty(global, "localStorage", { value: original, configurable: true });
  });

  it("returns defaults if localStorage.getItem returns null", async () => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => null);
    const { loadSettings } = await import("../../src/helpers/settingsUtils.js");
    const settings = await loadSettings();
    expect(settings).toEqual({
      sound: true,
      fullNavMap: true,
      motionEffects: true,
      displayMode: "light",
      gameModes: {}
    });
    Storage.prototype.getItem = originalGetItem;
  });

  /**
   * Should update a single setting and persist the change.
   */
  it("updates a single setting and persists", async () => {
    vi.useFakeTimers();
    const { updateSetting, loadSettings } = await import("../../src/helpers/settingsUtils.js");
    const promise = updateSetting("sound", false);
    await vi.advanceTimersByTimeAsync(110);
    await promise;
    await Promise.resolve();
    const stored = await loadSettings();
    expect(stored.sound).toBe(false);
  });

  /**
   * Should reject if settings JSON is invalid.
   */
  it("rejects when parsing fails", async () => {
    localStorage.setItem("settings", "{bad json}");
    const { loadSettings } = await import("../../src/helpers/settingsUtils.js");
    await expect(loadSettings()).rejects.toBeInstanceOf(Error);
  });

  /**
   * Should reject if localStorage.setItem throws.
   */
  it("rejects when localStorage.setItem throws", async () => {
    Storage.prototype.setItem = vi.fn(() => {
      throw new Error("fail");
    });
    const { saveSettings } = await import("../../src/helpers/settingsUtils.js");
    await expect(
      saveSettings({
        sound: true,
        fullNavMap: true,
        motionEffects: true,
        displayMode: "light",
        gameModes: {}
      })
    ).rejects.toThrow("fail");
    Storage.prototype.setItem = originalSetItem;
  });

  /**
   * Should return default value when updating a non-existent key.
   */
  it("rejects when updating unknown key", async () => {
    vi.useFakeTimers();
    const { updateSetting, loadSettings } = await import("../../src/helpers/settingsUtils.js");
    await expect(updateSetting("nonexistentKey", "value")).rejects.toThrow(
      "Schema validation failed"
    );
    await vi.advanceTimersByTimeAsync(110);
    const stored = await loadSettings();
    expect(stored).toEqual(DEFAULT_SETTINGS);
    expect(stored.nonexistentKey).toBeUndefined();
  });

  /**
   * Should only persist the last settings when saveSettings is called rapidly.
   */
  it("debounces multiple saveSettings calls", async () => {
    vi.useFakeTimers();
    const { saveSettings } = await import("../../src/helpers/settingsUtils.js");
    const data1 = {
      sound: true,
      fullNavMap: false,
      motionEffects: true,
      displayMode: "light",
      gameModes: {}
    };
    const data2 = {
      sound: false,
      fullNavMap: true,
      motionEffects: false,
      displayMode: "dark",
      gameModes: {}
    };
    saveSettings(data1);
    saveSettings(data2);
    await vi.advanceTimersByTimeAsync(110);
    expect(JSON.parse(localStorage.getItem("settings"))).toEqual(data2);
  });
});
