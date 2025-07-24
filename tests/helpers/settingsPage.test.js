import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSettingsDom } from "../utils/testUtils.js";

const baseSettings = {
  sound: true,
  fullNavMap: true,
  motionEffects: true,
  displayMode: "light",
  gameModes: {},
  featureFlags: { randomStatMode: true }
};

describe("settingsPage module", () => {
  beforeEach(() => {
    document.body.appendChild(createSettingsDom());
  });

  it("loads settings and game modes on DOMContentLoaded", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadGameModes = vi.fn().mockResolvedValue([]);
    const updateGameModeHidden = vi.fn();
    const applyDisplayMode = vi.fn();
    const applyMotionPreference = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadGameModes,
      updateGameModeHidden
    }));
    vi.doMock("../../src/helpers/displayMode.js", () => ({
      applyDisplayMode
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    expect(loadSettings).toHaveBeenCalled();
    expect(loadGameModes).toHaveBeenCalled();
    expect(applyDisplayMode).toHaveBeenCalledWith(baseSettings.displayMode);
    expect(applyMotionPreference).toHaveBeenCalledWith(baseSettings.motionEffects);
    vi.useRealTimers();
  });
  it("renders checkboxes for all modes", async () => {
    vi.useFakeTimers();
    const gameModes = [
      { id: "classic", name: "Classic", category: "mainMenu", order: 10 },
      { id: "blitz", name: "Blitz", category: "bonus", order: 20 },
      { id: "dojo", name: "Dojo", category: "mainMenu", order: 30 }
    ];
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadGameModes = vi.fn().mockResolvedValue(gameModes);
    const updateGameModeHidden = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadGameModes,
      updateGameModeHidden
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const container = document.getElementById("game-mode-toggle-container");
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    const labels = container.querySelectorAll("label span");
    expect(checkboxes).toHaveLength(3);
    expect(container.querySelector("#mode-classic")).toBeTruthy();
    expect(container.querySelector("#mode-dojo")).toBeTruthy();
    expect(container.querySelector("#mode-blitz")).toBeTruthy();
    expect(labels[0].textContent).toBe("Classic (mainMenu - 10)");
    expect(labels[1].textContent).toBe("Blitz (bonus - 20)");
    expect(labels[2].textContent).toBe("Dojo (mainMenu - 30)");
  });

  it("checkbox state reflects isHidden when no setting exists", async () => {
    vi.useFakeTimers();
    const gameModes = [
      { id: "team", name: "Team", category: "mainMenu", order: 5, isHidden: true }
    ];
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadGameModes = vi.fn().mockResolvedValue(gameModes);
    const updateGameModeHidden = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadGameModes,
      updateGameModeHidden
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const input = document.getElementById("mode-team");
    expect(input.checked).toBe(false);
  });

  it("updates isHidden when a checkbox is toggled", async () => {
    vi.useFakeTimers();
    const gameModes = [{ id: "classic", name: "Classic", category: "mainMenu", isHidden: false }];
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadGameModes = vi.fn().mockResolvedValue(gameModes);
    const updateGameModeHidden = vi.fn().mockResolvedValue([{ ...gameModes[0], isHidden: true }]);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadGameModes,
      updateGameModeHidden
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const input = document.getElementById("mode-classic");
    input.checked = false;
    input.dispatchEvent(new Event("change"));

    expect(updateGameModeHidden).toHaveBeenCalledWith("classic", true);
  });

  it("renders feature flag switches", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadGameModes = vi.fn().mockResolvedValue([]);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadGameModes,
      updateGameModeHidden: vi.fn()
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const container = document.getElementById("feature-flags-container");
    const input = container.querySelector("#feature-random-stat-mode");
    expect(input).toBeTruthy();
    expect(input.checked).toBe(true);
  });
});
