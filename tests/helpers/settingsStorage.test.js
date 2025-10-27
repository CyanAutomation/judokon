import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import {
  updateSetting,
  resetSettings,
  saveSettings,
  flushSettingsSave
} from "../../src/helpers/settingsStorage.js";
import { getCachedSettings, resetCache } from "../../src/helpers/settingsCache.js";
import { DEFAULT_SETTINGS } from "../../src/config/settingsDefaults.js";

/**
 * @vitest-environment jsdom
 */
describe("updateSetting", () => {
  beforeEach(() => {
    resetSettings();
    localStorage.clear();
  });

  it("persists changes when localStorage is available", async () => {
    await updateSetting("sound", false);
    const stored = JSON.parse(localStorage.getItem("settings"));
    expect(stored.sound).toBe(false);
    expect(getCachedSettings().sound).toBe(false);
  });

  it("updates cache when localStorage is unavailable", async () => {
    const original = globalThis.localStorage;
    // Simulate environment without localStorage
    Object.defineProperty(globalThis, "localStorage", {
      value: undefined,
      configurable: true
    });
    resetCache();

    await updateSetting("sound", false);
    expect(getCachedSettings().sound).toBe(false);

    Object.defineProperty(globalThis, "localStorage", {
      value: original,
      configurable: true
    });
  });

  it("serializes concurrent updates", async () => {
    const update1 = updateSetting("sound", false);
    const update2 = updateSetting("motionEffects", false);
    await Promise.all([update1, update2]);
    const stored = JSON.parse(localStorage.getItem("settings"));
    expect(stored.sound).toBe(false);
    expect(stored.motionEffects).toBe(false);
  });
});

describe("resetSettings", () => {
  let timerControl;

  beforeEach(() => {
    resetSettings();
    localStorage.clear();
    resetCache();
    timerControl = useCanonicalTimers();
  });

  afterEach(() => {
    timerControl.cleanup();
  });

  it("cancels a pending debounced save so defaults persist", async () => {
    const pendingSave = saveSettings({
      ...DEFAULT_SETTINGS,
      sound: false
    });

    // Simulate a pre-existing custom value to verify the reset overwrites it.
    localStorage.setItem("settings", JSON.stringify({ ...DEFAULT_SETTINGS, sound: true }));

    resetSettings();

    await expect(pendingSave).rejects.toMatchObject({ name: "DebounceError" });

    expect(JSON.parse(localStorage.getItem("settings"))).toEqual(DEFAULT_SETTINGS);

    vi.runAllTimers();

    expect(JSON.parse(localStorage.getItem("settings"))).toEqual(DEFAULT_SETTINGS);
    expect(getCachedSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("saveSettings", () => {
  beforeEach(() => {
    resetCache();
    localStorage.clear();
  });

  it("updates the cache after the debounced write resolves", async () => {
    const nextSettings = {
      ...DEFAULT_SETTINGS,
      sound: false
    };

    const pending = saveSettings(nextSettings);
    flushSettingsSave();

    await pending;

    expect(getCachedSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      sound: false
    });
    expect(JSON.parse(localStorage.getItem("settings")).sound).toBe(false);
  });

  it("updates the cache even when localStorage is unavailable", async () => {
    const originalStorage = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: undefined,
      configurable: true
    });
    resetCache();

    const nextSettings = {
      ...DEFAULT_SETTINGS,
      motionEffects: false
    };

    const pending = saveSettings(nextSettings);
    flushSettingsSave();

    await pending;

    expect(getCachedSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      motionEffects: false
    });

    Object.defineProperty(globalThis, "localStorage", {
      value: originalStorage,
      configurable: true
    });
  });

  it("reflects new values in the cache immediately after resolving", async () => {
    const timers = useCanonicalTimers();
    try {
      const nextSettings = {
        ...DEFAULT_SETTINGS,
        subtitles: false
      };

      const pending = saveSettings(nextSettings);

      await timers.runAllTimersAsync();
      await pending;

      expect(getCachedSettings()).toEqual({
        ...DEFAULT_SETTINGS,
        subtitles: false
      });
    } finally {
      timers.cleanup();
    }
  });
});

describe("getSettingsSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("retries after a rejection by clearing the cached promise", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ title: "schema-from-fetch" })
      });
    vi.stubGlobal("fetch", fetchMock);

    // Reset module state so the module-level settingsSchemaPromise starts undefined.
    vi.resetModules();

    let restoreImporter;

    try {
      const module = await import("../../src/helpers/settingsStorage.js");
      const { getSettingsSchema, __setSettingsSchemaImporter } = module;

      let importAttempts = 0;
      __setSettingsSchemaImporter(async () => {
        importAttempts += 1;
        if (importAttempts === 1) {
          throw new Error("import failure");
        }
        return { default: { title: "schema-from-import" } };
      });
      restoreImporter = () => __setSettingsSchemaImporter(undefined);

      await expect(getSettingsSchema()).rejects.toThrow("import failure");

      // Wait for the retry-clearing timeout to run before attempting again.
      await new Promise((resolve) => setTimeout(resolve, 0));

      const schema = await getSettingsSchema();
      expect(schema).toEqual({ title: "schema-from-fetch" });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(importAttempts).toBe(1);
    } finally {
      if (typeof restoreImporter === "function") {
        restoreImporter();
      }
    }
  });
});
