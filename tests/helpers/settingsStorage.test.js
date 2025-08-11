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
});
