import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { updateSetting, resetSettings } from "../../src/helpers/settingsStorage.js";
import { getCachedSettings, resetCache } from "../../src/helpers/settingsCache.js";

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
