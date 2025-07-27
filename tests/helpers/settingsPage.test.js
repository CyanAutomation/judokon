import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSettingsDom } from "../utils/testUtils.js";

const baseSettings = {
  sound: true,
  motionEffects: true,
  typewriterEffect: true,
  displayMode: "light",
  gameModes: {},
  featureFlags: {
    randomStatMode: true,
    battleDebugPanel: false,
    fullNavigationMap: true,
    enableTestMode: false,
    enableCardInspector: false,
    enableLowConfidenceResults: false
  }
};

describe("settingsPage module", () => {
  beforeEach(() => {
    document.body.appendChild(createSettingsDom());
  });

  it("loads settings and game modes on DOMContentLoaded", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadNavigationItems = vi.fn().mockResolvedValue([]);
    const updateNavigationItemHidden = vi.fn();
    const applyDisplayMode = vi.fn();
    const applyMotionPreference = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden
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
    expect(loadNavigationItems).toHaveBeenCalled();
    expect(applyDisplayMode).toHaveBeenCalledWith(baseSettings.displayMode);
    expect(applyMotionPreference).toHaveBeenCalledWith(baseSettings.motionEffects);
    vi.useRealTimers();
  });
  it("renders checkboxes for all modes", async () => {
    vi.useFakeTimers();
    const gameModes = [
      { id: 1, name: "Classic", category: "mainMenu", order: 10 },
      { id: 2, name: "Blitz", category: "bonus", order: 20 },
      { id: 3, name: "Dojo", category: "mainMenu", order: 30 }
    ];
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadNavigationItems = vi.fn().mockResolvedValue(gameModes);
    const updateNavigationItemHidden = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const container = document.getElementById("game-mode-toggle-container");
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    const labels = container.querySelectorAll("label span");
    expect(checkboxes).toHaveLength(3);
    expect(container.querySelector("#mode-1")).toBeTruthy();
    expect(container.querySelector("#mode-3")).toBeTruthy();
    expect(container.querySelector("#mode-2")).toBeTruthy();
    expect(labels[0].textContent).toBe("Classic (mainMenu - 10)");
    expect(labels[1].textContent).toBe("Blitz (bonus - 20)");
    expect(labels[2].textContent).toBe("Dojo (mainMenu - 30)");
  });

  it("checkbox state reflects isHidden when no setting exists", async () => {
    vi.useFakeTimers();
    const gameModes = [{ id: 4, name: "Team", category: "mainMenu", order: 5, isHidden: true }];
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadNavigationItems = vi.fn().mockResolvedValue(gameModes);
    const updateNavigationItemHidden = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const input = document.getElementById("mode-4");
    expect(input.checked).toBe(false);
  });

  it("updates isHidden when a checkbox is toggled", async () => {
    vi.useFakeTimers();
    const gameModes = [{ id: 1, name: "Classic", category: "mainMenu", isHidden: false }];
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadNavigationItems = vi.fn().mockResolvedValue(gameModes);
    const updateNavigationItemHidden = vi
      .fn()
      .mockResolvedValue([{ ...gameModes[0], isHidden: true }]);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const input = document.getElementById("mode-1");
    input.checked = false;
    input.dispatchEvent(new Event("change"));

    expect(updateNavigationItemHidden).toHaveBeenCalledWith(1, true);
  });

  it("renders feature flag switches", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadNavigationItems = vi.fn().mockResolvedValue([]);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden: vi.fn()
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const container = document.getElementById("feature-flags-container");
    expect(container.classList.contains("game-mode-toggle-container")).toBe(true);
    const randomInput = container.querySelector("#feature-random-stat-mode");
    const debugInput = container.querySelector("#feature-battle-debug-panel");
    expect(randomInput).toBeTruthy();
    expect(debugInput).toBeTruthy();
    expect(randomInput.checked).toBe(true);
    expect(debugInput.checked).toBe(false);
  });

  it("updates feature flag when toggled", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updatedSettings = {
      ...baseSettings,
      featureFlags: { ...baseSettings.featureFlags, battleDebugPanel: true }
    };
    const updateSetting = vi.fn().mockResolvedValue(updatedSettings);
    const loadNavigationItems = vi.fn().mockResolvedValue([]);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden: vi.fn()
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const container = document.getElementById("feature-flags-container");
    const debugInput = container.querySelector("#feature-battle-debug-panel");
    debugInput.checked = true;
    debugInput.dispatchEvent(new Event("change"));

    expect(updateSetting).toHaveBeenCalledWith("featureFlags", {
      randomStatMode: true,
      battleDebugPanel: true,
      fullNavigationMap: true,
      enableTestMode: false,
      enableCardInspector: false,
      enableLowConfidenceResults: false
    });
  });

  it("clicking restore defaults resets controls", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const resetSettings = vi.fn().mockReturnValue(baseSettings);
    const loadNavigationItems = vi.fn().mockResolvedValue([]);
    const applyDisplayMode = vi.fn();
    const applyMotionPreference = vi.fn();
    const applyInitialControlValues = vi.fn();
    const attachToggleListeners = vi.fn();
    const renderGameModeSwitches = vi.fn();
    const renderFeatureFlagSwitches = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting,
      resetSettings,
      DEFAULT_SETTINGS: baseSettings
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden: vi.fn()
    }));
    vi.doMock("../../src/helpers/displayMode.js", () => ({ applyDisplayMode }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));
    vi.doMock("../../src/helpers/settings/index.js", () => ({
      applyInitialControlValues,
      attachToggleListeners,
      renderGameModeSwitches,
      renderFeatureFlagSwitches,
      setupSectionToggles: vi.fn()
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips: vi.fn() }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const btn = document.getElementById("reset-settings-button");
    btn.dispatchEvent(new Event("click"));

    expect(resetSettings).toHaveBeenCalled();
    expect(applyInitialControlValues).toHaveBeenCalledTimes(2);
    expect(renderGameModeSwitches).toHaveBeenCalledTimes(2);
    expect(renderFeatureFlagSwitches).toHaveBeenCalledTimes(2);
    expect(applyDisplayMode).toHaveBeenLastCalledWith(baseSettings.displayMode);
    expect(applyMotionPreference).toHaveBeenLastCalledWith(baseSettings.motionEffects);
    vi.useRealTimers();
  });
});
