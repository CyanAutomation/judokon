import { describe, it, expect, afterEach, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/helpers/settingsUtils.js";

/**
 * @fileoverview
 * Unit tests for settingsUtils helper functions.
 * Covers loading, saving, updating, and error handling for settings in localStorage.
 */

describe("settings utils", () => {
  /** Save original setItem to restore after tests */
  const originalSetItem = Storage.prototype.setItem;
  /** Cache original localStorage to restore after all tests */
  const originalLocalStorage = global.localStorage;

  beforeAll(() => {
    // Save the original localStorage implementation
    Object.defineProperty(global, "localStorage", {
      value: originalLocalStorage,
      configurable: true,
      writable: true
    });
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
  });

  /**
   * Should load default settings when localStorage is empty.
   */
  it("loads defaults when storage is empty", async () => {
    const { loadSettings } = await import("../../src/helpers/settingsUtils.js");
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  /**
   * Should debounce and save settings to localStorage.
   */
  it("saves settings with debounce", async () => {
    vi.useFakeTimers();
    const { saveSettings } = await import("../../src/helpers/settingsUtils.js");
    const data = {
      sound: false,
      motionEffects: true,
      typewriterEffect: false,
      displayMode: "dark",
      gameModes: {},
      featureFlags: {
        battleDebugPanel: {
          enabled: false,
          label: "Battle Debug Panel",
          description: "Adds a collapsible debug panel"
        },
        fullNavigationMap: {
          enabled: false,
          label: "Full Navigation Map",
          description: "Expanded map navigation"
        },
        enableTestMode: {
          enabled: false,
          label: "Test Mode",
          description: "Deterministic card draws for testing"
        },
        enableCardInspector: {
          enabled: false,
          label: "Card Inspector",
          description: "Shows raw card JSON in a panel"
        }
      }
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
    expect(settings).toEqual(DEFAULT_SETTINGS);
    Storage.prototype.getItem = originalGetItem;
  });

  /**
   * Should update a single setting and persist the change.
   */
  it("updates a single setting and persists", async () => {
    vi.useFakeTimers();
    const { updateSetting, loadSettings } = await import("../../src/helpers/settingsUtils.js");
    const promise = updateSetting("sound", false);
    await vi.runAllTimersAsync();
    await promise;
    const stored = await loadSettings();
    expect(stored.sound).toBe(false);
  });

  /**
   * Should reset to defaults if settings JSON is invalid.
   */
  it("recovers from invalid stored JSON", async () => {
    localStorage.setItem("settings", "{bad json}");
    const { loadSettings } = await import("../../src/helpers/settingsUtils.js");
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem("settings")).toBeNull();
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
        motionEffects: true,
        typewriterEffect: false,
        displayMode: "light",
        gameModes: {},
        featureFlags: {
          battleDebugPanel: {
            enabled: false,
            label: "Battle Debug Panel",
            description: "Adds a collapsible debug panel"
          },
          fullNavigationMap: {
            enabled: false,
            label: "Full Navigation Map",
            description: "Expanded map navigation"
          },
          enableTestMode: {
            enabled: false,
            label: "Test Mode",
            description: "Deterministic card draws for testing"
          },
          enableCardInspector: {
            enabled: false,
            label: "Card Inspector",
            description: "Shows raw card JSON in a panel"
          }
        }
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
      motionEffects: true,
      typewriterEffect: false,
      displayMode: "light",
      gameModes: {},
      featureFlags: {
        battleDebugPanel: {
          enabled: false,
          label: "Battle Debug Panel",
          description: "Adds a collapsible debug panel"
        },
        fullNavigationMap: {
          enabled: false,
          label: "Full Navigation Map",
          description: "Expanded map navigation"
        },
        enableTestMode: {
          enabled: false,
          label: "Test Mode",
          description: "Deterministic card draws for testing"
        },
        enableCardInspector: {
          enabled: false,
          label: "Card Inspector",
          description: "Shows raw card JSON in a panel"
        }
      }
    };
    const data2 = {
      sound: false,
      motionEffects: false,
      typewriterEffect: false,
      displayMode: "dark",
      gameModes: {},
      featureFlags: {
        battleDebugPanel: {
          enabled: false,
          label: "Battle Debug Panel",
          description: "Adds a collapsible debug panel"
        },
        fullNavigationMap: {
          enabled: false,
          label: "Full Navigation Map",
          description: "Expanded map navigation"
        },
        enableTestMode: {
          enabled: false,
          label: "Test Mode",
          description: "Deterministic card draws for testing"
        },
        enableCardInspector: {
          enabled: false,
          label: "Card Inspector",
          description: "Shows raw card JSON in a panel"
        }
      }
    };
    saveSettings(data1);
    saveSettings(data2);
    await vi.advanceTimersByTimeAsync(110);
    expect(JSON.parse(localStorage.getItem("settings"))).toEqual(data2);
  });

  it("resets settings to defaults", async () => {
    localStorage.setItem("settings", JSON.stringify({ sound: true }));
    const { resetSettings } = await import("../../src/helpers/settingsUtils.js");
    const result = resetSettings();
    expect(result).toEqual(DEFAULT_SETTINGS);
    expect(JSON.parse(localStorage.getItem("settings"))).toEqual(DEFAULT_SETTINGS);
  });
});
