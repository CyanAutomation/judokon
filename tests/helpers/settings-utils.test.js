import { describe, it, expect, afterEach, vi } from "vitest";

const originalSetItem = Storage.prototype.setItem;

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  vi.resetModules();
});

describe("settings utils", () => {
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

  it("saves settings with debounce", async () => {
    const { saveSettings } = await import("../../src/helpers/settingsUtils.js");
    const data = {
      sound: false,
      fullNavMap: true,
      motionEffects: true,
      displayMode: "dark",
      gameModes: {}
    };
    await saveSettings(data);
    vi.advanceTimersByTime(110);
    expect(JSON.parse(localStorage.getItem("settings"))).toEqual(data);
    vi.useRealTimers();
  });

  it("updates a single setting and persists", async () => {
    vi.useFakeTimers();
    const { updateSetting, loadSettings } = await import("../../src/helpers/settingsUtils.js");
    await updateSetting("sound", false);
    vi.advanceTimersByTime(110);
    const stored = await loadSettings();
    expect(stored.sound).toBe(false);
    vi.useRealTimers();
  });

  it("rejects when parsing fails", async () => {
    localStorage.setItem("settings", "{bad json}");
    const { loadSettings } = await import("../../src/helpers/settingsUtils.js");
    await expect(loadSettings()).rejects.toBeInstanceOf(Error);
  });

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
});
