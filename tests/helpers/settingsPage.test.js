import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSettingsDom } from "../utils/testUtils.js";
import * as storage from "../../src/helpers/storage.js";

const baseSettings = {
  sound: true,
  motionEffects: true,
  typewriterEffect: true,
  tooltips: true,
  showCardOfTheDay: false,
  displayMode: "light",
  fullNavigationMap: true,
  gameModes: {},
  featureFlags: {
    randomStatMode: { enabled: true },
    battleDebugPanel: { enabled: false },
    enableTestMode: { enabled: false },
    enableCardInspector: { enabled: false },
    viewportSimulation: { enabled: false },
    tooltipOverlayDebug: { enabled: false },
    layoutDebugPanel: { enabled: false, tooltipId: "settings.layoutDebugPanel" },
    navCacheResetButton: { enabled: false }
  }
};

beforeEach(() => {
  vi.doMock("../../src/helpers/tooltip.js", () => ({
    initTooltips: vi.fn(),
    getTooltips: vi.fn().mockResolvedValue(tooltipMap)
  }));
});

const tooltipMap = {
  "settings.randomStatMode.label": "Random Stat Mode",
  "settings.randomStatMode.description": "Auto-selects a random stat when timer expires",
  "settings.battleDebugPanel.label": "Battle Debug Panel",
  "settings.battleDebugPanel.description": "Adds a collapsible debug panel",
  "settings.fullNavigationMap.label": "Full Navigation Map",
  "settings.fullNavigationMap.description": "Expanded map navigation",
  "settings.enableTestMode.label": "Test Mode",
  "settings.enableTestMode.description": "Deterministic card draws for testing",
  "settings.enableCardInspector.label": "Card Inspector",
  "settings.enableCardInspector.description": "Shows raw card JSON in a panel",
  "settings.showCardOfTheDay.label": "Card Of The Day",
  "settings.showCardOfTheDay.description":
    "Displays a rotating featured judoka card on the landing screen",
  "settings.viewportSimulation.label": "Viewport Simulation",
  "settings.viewportSimulation.description":
    "Adds a dropdown to simulate common device viewport sizes",
  "settings.tooltipOverlayDebug.label": "Tooltip Overlay Debug",
  "settings.tooltipOverlayDebug.description": "Shows bounding boxes for tooltip targets",
  "settings.layoutDebugPanel.label": "Layout Debug Panel",
  "settings.layoutDebugPanel.description":
    "Displays CSS grid and flex outlines for debugging layout issues",
  "settings.navCacheResetButton.label": "Navigation Cache Reset",
  "settings.navCacheResetButton.description":
    "Adds a button to clear cached navigation data for troubleshooting"
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

  it("renders fallback game modes when navigation items fail", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const loadNavigationItems = vi.fn().mockRejectedValue(new Error("fail"));
    const loadGameModes = vi
      .fn()
      .mockResolvedValue([{ id: 1, name: "Classic", category: "mainMenu", order: 10 }]);
    const updateNavigationItemHidden = vi.fn();
    const showSettingsError = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes,
      updateNavigationItemHidden
    }));
    vi.doMock("../../src/helpers/showSettingsError.js", () => ({ showSettingsError }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    expect(loadNavigationItems).toHaveBeenCalled();
    expect(loadGameModes).toHaveBeenCalled();
    expect(showSettingsError).toHaveBeenCalled();
    const container = document.getElementById("game-mode-toggle-container");
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    expect(checkboxes).toHaveLength(1);
    expect(container.querySelector("#mode-1")).toBeTruthy();
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
    const wrappers = container.querySelectorAll(".settings-item");
    expect(checkboxes).toHaveLength(3);
    expect(container.querySelector("#mode-1")).toBeTruthy();
    expect(container.querySelector("#mode-3")).toBeTruthy();
    expect(container.querySelector("#mode-2")).toBeTruthy();
    expect(labels[0].textContent).toBe("Classic");
    expect(labels[1].textContent).toBe("Blitz");
    expect(labels[2].textContent).toBe("Dojo");
    expect(wrappers[0].dataset.category).toBe("mainMenu");
    expect(wrappers[0].dataset.order).toBe("10");
    expect(wrappers[1].dataset.category).toBe("bonus");
    expect(wrappers[1].dataset.order).toBe("20");
    expect(wrappers[2].dataset.category).toBe("mainMenu");
    expect(wrappers[2].dataset.order).toBe("30");
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
    const showSnackbar = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const input = document.getElementById("mode-1");
    input.checked = false;
    input.dispatchEvent(new Event("change"));

    expect(updateNavigationItemHidden).toHaveBeenCalledWith(1, true);
    await vi.runAllTimersAsync();
    expect(showSnackbar).toHaveBeenCalledWith("Classic disabled");
  });

  it("renders tooltip toggle and updates setting", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updated = { ...baseSettings, tooltips: false };
    const updateSetting = vi.fn().mockResolvedValue(updated);
    const loadNavigationItems = vi.fn().mockResolvedValue([]);
    const showSnackbar = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden: vi.fn()
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const input = document.getElementById("tooltips-toggle");
    expect(input).toBeTruthy();
    input.checked = false;
    input.dispatchEvent(new Event("change"));
    expect(updateSetting).toHaveBeenCalledWith("tooltips", false);
    await vi.runAllTimersAsync();
    expect(showSnackbar).toHaveBeenCalledWith("Tooltips disabled");
  });

  it("renders full navigation map toggle and updates setting", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updated = { ...baseSettings, fullNavigationMap: false };
    const updateSetting = vi.fn().mockResolvedValue(updated);
    const loadNavigationItems = vi.fn().mockResolvedValue([]);
    const showSnackbar = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden: vi.fn()
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const input = document.getElementById("full-navigation-map-toggle");
    expect(input).toBeTruthy();
    input.checked = false;
    input.dispatchEvent(new Event("change"));
    expect(updateSetting).toHaveBeenCalledWith("fullNavigationMap", false);
    await vi.runAllTimersAsync();
    expect(showSnackbar).toHaveBeenCalledWith("Full navigation map disabled");
  });

  it("toggling showCardOfTheDay updates setting", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updated = { ...baseSettings, showCardOfTheDay: true };
    const updateSetting = vi.fn().mockResolvedValue(updated);
    const loadNavigationItems = vi.fn().mockResolvedValue([]);
    const showSnackbar = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden: vi.fn()
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const input = document.getElementById("card-of-the-day-toggle");
    expect(input).toBeTruthy();
    input.checked = true;
    input.dispatchEvent(new Event("change"));
    expect(updateSetting).toHaveBeenCalledWith("showCardOfTheDay", true);
    await vi.runAllTimersAsync();
    expect(showSnackbar).toHaveBeenCalledWith("Card of the Day enabled");
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
    const inspectorInput = container.querySelector('[data-flag="enableCardInspector"]');
    expect(randomInput).toBeTruthy();
    expect(inspectorInput).toBeTruthy();
    expect(randomInput.checked).toBe(true);
    expect(inspectorInput.checked).toBe(false);
  });

  it("places feature flags inside the advanced settings section", async () => {
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

    const section = document.getElementById("advanced-settings-content");
    const container = document.getElementById("feature-flags-container");
    expect(section.contains(container)).toBe(true);
  });

  it("shows snackbar when feature flag changes", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updatedSettings = {
      ...baseSettings,
      featureFlags: {
        ...baseSettings.featureFlags,
        randomStatMode: {
          ...baseSettings.featureFlags.randomStatMode,
          enabled: false
        }
      }
    };
    const updateSetting = vi.fn().mockResolvedValue(updatedSettings);
    const loadNavigationItems = vi.fn().mockResolvedValue([]);
    const showSnackbar = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden: vi.fn()
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const input = document.querySelector("#feature-random-stat-mode");
    input.checked = false;
    input.dispatchEvent(new Event("change"));
    await vi.runAllTimersAsync();

    expect(showSnackbar).toHaveBeenCalledWith(
      `${tooltipMap["settings.randomStatMode.label"]} disabled`
    );
  });

  it("updates feature flag when toggled", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updatedSettings = {
      ...baseSettings,
      featureFlags: {
        ...baseSettings.featureFlags,
        battleDebugPanel: {
          ...baseSettings.featureFlags.battleDebugPanel,
          enabled: true
        }
      }
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
      randomStatMode: baseSettings.featureFlags.randomStatMode,
      battleDebugPanel: {
        ...baseSettings.featureFlags.battleDebugPanel,
        enabled: true
      },
      enableTestMode: baseSettings.featureFlags.enableTestMode,
      enableCardInspector: baseSettings.featureFlags.enableCardInspector,
      viewportSimulation: baseSettings.featureFlags.viewportSimulation,
      tooltipOverlayDebug: baseSettings.featureFlags.tooltipOverlayDebug,
      layoutDebugPanel: baseSettings.featureFlags.layoutDebugPanel,
      navCacheResetButton: baseSettings.featureFlags.navCacheResetButton
    });
  });

  it("toggling viewportSimulation updates setting", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updatedSettings = {
      ...baseSettings,
      featureFlags: {
        ...baseSettings.featureFlags,
        viewportSimulation: {
          ...baseSettings.featureFlags.viewportSimulation,
          enabled: true
        }
      }
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

    const input = document.querySelector("#feature-viewport-simulation");
    input.checked = true;
    input.dispatchEvent(new Event("change"));
    await vi.runAllTimersAsync();

    expect(updateSetting).toHaveBeenCalledWith("featureFlags", updatedSettings.featureFlags);
  });

  it("toggling tooltipOverlayDebug updates setting", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updatedSettings = {
      ...baseSettings,
      featureFlags: {
        ...baseSettings.featureFlags,
        tooltipOverlayDebug: {
          ...baseSettings.featureFlags.tooltipOverlayDebug,
          enabled: true
        }
      }
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

    const input = document.querySelector("#feature-tooltip-overlay-debug");
    input.checked = true;
    input.dispatchEvent(new Event("change"));
    await vi.runAllTimersAsync();

    expect(updateSetting).toHaveBeenCalledWith("featureFlags", updatedSettings.featureFlags);
  });

  it("toggling layoutDebugPanel updates setting", async () => {
    vi.useFakeTimers();
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const updatedSettings = {
      ...baseSettings,
      featureFlags: {
        ...baseSettings.featureFlags,
        layoutDebugPanel: {
          ...baseSettings.featureFlags.layoutDebugPanel,
          enabled: true
        }
      }
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

    const input = document.querySelector("#feature-layout-debug-panel");
    input.checked = true;
    input.dispatchEvent(new Event("change"));
    await vi.runAllTimersAsync();

    expect(updateSetting).toHaveBeenCalledWith("featureFlags", updatedSettings.featureFlags);
  });

  it("clicking restore defaults requires confirmation", async () => {
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
    vi.doMock("../../src/helpers/settings/applyInitialValues.js", () => ({
      applyInitialControlValues,
      applyInputState: vi.fn()
    }));
    vi.doMock("../../src/helpers/settings/listenerUtils.js", () => ({
      attachToggleListeners
    }));
    vi.doMock("../../src/helpers/settings/gameModeSwitches.js", () => ({
      renderGameModeSwitches
    }));
    vi.doMock("../../src/helpers/settings/featureFlagSwitches.js", () => ({
      renderFeatureFlagSwitches
    }));
    vi.doMock("../../src/helpers/settings/sectionToggle.js", () => ({
      setupSectionToggles: vi.fn()
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn(),
      getTooltips: vi.fn().mockResolvedValue(tooltipMap)
    }));

    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const btn = document.getElementById("reset-settings-button");
    btn.dispatchEvent(new Event("click"));
    expect(resetSettings).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    const confirm = document.getElementById("confirm-reset-button");
    confirm.dispatchEvent(new Event("click"));

    expect(resetSettings).toHaveBeenCalled();
    expect(applyInitialControlValues).toHaveBeenCalledTimes(2);
    expect(renderGameModeSwitches).toHaveBeenCalledTimes(2);
    expect(renderFeatureFlagSwitches).toHaveBeenCalledTimes(2);
    expect(applyDisplayMode).toHaveBeenLastCalledWith(baseSettings.displayMode);
    expect(applyMotionPreference).toHaveBeenLastCalledWith(baseSettings.motionEffects);
    vi.useRealTimers();
  });

  it("adds navigation cache reset button when flag enabled", async () => {
    vi.useFakeTimers();
    const settingsWithButton = {
      ...baseSettings,
      featureFlags: {
        ...baseSettings.featureFlags,
        navCacheResetButton: {
          ...baseSettings.featureFlags.navCacheResetButton,
          enabled: true
        }
      }
    };
    const loadSettings = vi.fn().mockResolvedValue(settingsWithButton);
    const updateSetting = vi.fn().mockResolvedValue(settingsWithButton);
    const loadNavigationItems = vi.fn().mockResolvedValue([]);
    const populateNavbar = vi.fn();
    const showSnackbar = vi.fn();
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      loadSettings,
      updateSetting,
      resetSettings: vi.fn()
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems,
      loadGameModes: loadNavigationItems,
      updateNavigationItemHidden: vi.fn()
    }));
    vi.doMock("../../src/helpers/navigationBar.js", () => ({ populateNavbar }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));

    const removeSpy = vi.spyOn(storage, "removeItem");
    await import("../../src/helpers/settingsPage.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));
    await vi.runAllTimersAsync();

    const btn = document.getElementById("nav-cache-reset-button");
    expect(btn).toBeTruthy();
    storage.setItem("navigationItems", "foo");
    btn.dispatchEvent(new Event("click"));
    await vi.runAllTimersAsync();
    expect(removeSpy).toHaveBeenCalledWith("navigationItems");
    expect(storage.getItem("navigationItems")).toBeNull();
    expect(populateNavbar).toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith("Navigation cache cleared");
    vi.useRealTimers();
  });
});
