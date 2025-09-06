import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSettingsDom, resetDom } from "../utils/testUtils.js";

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
    enableTestMode: { enabled: false },
    enableCardInspector: { enabled: false },
    viewportSimulation: { enabled: false },
    tooltipOverlayDebug: { enabled: false },
    layoutDebugPanel: { enabled: false, tooltipId: "settings.layoutDebugPanel" },
    navCacheResetButton: { enabled: false }
  }
};

const tooltipMap = {
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

let currentFlags = baseSettings.featureFlags;

beforeEach(() => {
  resetDom();
  document.body.appendChild(createSettingsDom());
  vi.doMock("../../src/helpers/tooltip.js", () => ({
    initTooltips: vi.fn().mockResolvedValue(() => {}),
    getTooltips: vi.fn()
  }));
  vi.doMock("../../src/helpers/displayMode.js", () => ({ applyDisplayMode: vi.fn() }));
  vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference: vi.fn() }));
  vi.doMock("../../src/helpers/viewportDebug.js", () => ({ toggleViewportSimulation: vi.fn() }));
  vi.doMock("../../src/helpers/tooltipOverlayDebug.js", () => ({
    toggleTooltipOverlayDebug: vi.fn()
  }));
  vi.doMock("../../src/helpers/layoutDebugPanel.js", () => ({ toggleLayoutDebugPanel: vi.fn() }));
  vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: vi.fn() }));
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    isEnabled: (flag) => currentFlags[flag]?.enabled ?? false,
    initFeatureFlags: vi.fn().mockResolvedValue(baseSettings)
  }));
  vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
    loadNavigationItems: vi.fn().mockResolvedValue([])
  }));
});

describe("fetchSettingsData", () => {
  it("rejects on fetch failure", async () => {
    vi.resetModules();
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems: vi.fn().mockResolvedValue([])
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      getTooltips: vi.fn().mockResolvedValue({}),
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn().mockRejectedValue(new Error("fail")),
      isEnabled: vi.fn()
    }));
    const { fetchSettingsData } = await import("../../src/helpers/settingsPage.js");
    await expect(fetchSettingsData()).rejects.toThrow("Failed to fetch settings data");
  });
});

describe("renderSettingsControls", () => {
  it("renders expected toggles", async () => {
    const gameModes = [
      { id: 1, name: "Classic", category: "mainMenu", order: 10 },
      { id: 2, name: "Blitz", category: "bonus", order: 20 },
      { id: 3, name: "Dojo", category: "mainMenu", order: 30 }
    ];
    const { renderSettingsControls } = await import("../../src/helpers/settingsPage.js");
    renderSettingsControls(baseSettings, gameModes, tooltipMap);
    const container = document.getElementById("game-mode-toggle-container");
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    expect(checkboxes).toHaveLength(3);
    expect(document.getElementById("feature-enable-test-mode")).toBeTruthy();
  });

  it("updates navigation hidden state when a mode is toggled", async () => {
    const gameModes = [{ id: 1, name: "Classic", category: "mainMenu", isHidden: false }];
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const updateNavigationItemHidden = vi.fn().mockResolvedValue([]);
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      updateSetting,
      loadSettings: vi.fn(),
      resetSettings: vi.fn()
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      updateNavigationItemHidden,
      loadNavigationItems: vi.fn()
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    const { renderSettingsControls, handleGameModeChange } = await import(
      "../../src/helpers/settingsPage.js"
    );
    renderSettingsControls(baseSettings, gameModes, tooltipMap);
    const input = document.getElementById("mode-1");
    input.checked = false;
    await handleGameModeChange({
      input,
      mode: gameModes[0],
      label: gameModes[0].name,
      getCurrentSettings: () => baseSettings,
      handleUpdate: updateSetting
    });
    expect(updateNavigationItemHidden).toHaveBeenCalledWith(1, true);
  });

  it("persists feature flag changes", async () => {
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      updateSetting,
      loadSettings: vi.fn(),
      resetSettings: vi.fn()
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    const { renderSettingsControls, handleFeatureFlagChange } = await import(
      "../../src/helpers/settingsPage.js"
    );
    renderSettingsControls(baseSettings, [], tooltipMap);
    const input = document.querySelector("#feature-enable-test-mode");
    input.checked = true;
    await handleFeatureFlagChange({
      input,
      flag: "enableTestMode",
      info: baseSettings.featureFlags.enableTestMode,
      label: "enableTestMode",
      getCurrentSettings: () => baseSettings,
      handleUpdate: updateSetting
    });
    expect(updateSetting).toHaveBeenCalledWith(
      "featureFlags",
      {
        ...baseSettings.featureFlags,
        enableTestMode: { enabled: true }
      },
      expect.any(Function)
    );
  });

  it("adds navigation cache reset button when flag enabled", async () => {
    const settingsWithButton = {
      ...baseSettings,
      featureFlags: {
        ...baseSettings.featureFlags,
        navCacheResetButton: { ...baseSettings.featureFlags.navCacheResetButton, enabled: true }
      }
    };
    const populateNavbar = vi.fn();
    const showSnackbar = vi.fn();
    const resetNavigationCache = vi.fn();
    vi.doMock("../../src/helpers/navigationBar.js", () => ({ populateNavbar }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar,
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../src/helpers/navigationCache.js", () => ({ reset: resetNavigationCache }));
    currentFlags = settingsWithButton.featureFlags;
    const { renderSettingsControls } = await import("../../src/helpers/settingsPage.js");
    renderSettingsControls(settingsWithButton, [], tooltipMap);
    await Promise.resolve();
    await Promise.resolve();
    const btn = document.getElementById("nav-cache-reset-button");
    expect(btn).toBeTruthy();
    btn.dispatchEvent(new Event("click"));
    expect(resetNavigationCache).toHaveBeenCalled();
    expect(populateNavbar).toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith("Navigation cache cleared");
  });

  it("restores defaults when confirmed", async () => {
    const resetSettings = vi.fn();
    const initFeatureFlags = vi.fn().mockImplementation(async () => {
      currentFlags = baseSettings.featureFlags;
      return baseSettings;
    });
    const showSnackbar = vi.fn();
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      updateSetting: vi.fn(),
      loadSettings: vi.fn(),
      resetSettings
    }));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      isEnabled: (flag) => currentFlags[flag]?.enabled ?? false,
      initFeatureFlags
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar,
      updateSnackbar: vi.fn()
    }));
    const { renderSettingsControls } = await import("../../src/helpers/settingsPage.js");
    const settingsWithFlag = {
      ...baseSettings,
      featureFlags: {
        ...baseSettings.featureFlags,
        enableTestMode: { enabled: true }
      }
    };
    currentFlags = settingsWithFlag.featureFlags;
    renderSettingsControls(settingsWithFlag, [], tooltipMap);
    expect(document.getElementById("feature-enable-test-mode").checked).toBe(true);
    document.getElementById("reset-settings-button").dispatchEvent(new Event("click"));
    document.getElementById("confirm-reset-button").dispatchEvent(new Event("click"));
    await Promise.resolve();
    expect(resetSettings).toHaveBeenCalled();
    expect(initFeatureFlags).toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith("Settings restored to defaults");
    expect(document.getElementById("feature-enable-test-mode").checked).toBe(false);
  });

  it("does not duplicate reset listener on reinit", async () => {
    const { renderSettingsControls } = await import("../../src/helpers/settingsPage.js");
    renderSettingsControls(baseSettings, [], tooltipMap);
    const resetButton = document.getElementById("reset-settings-button");
    const addSpy = vi.spyOn(resetButton, "addEventListener");
    renderSettingsControls(baseSettings, [], tooltipMap);
    expect(addSpy).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });

  it("renders missing feature flags from defaults", async () => {
    const { renderSettingsControls } = await import("../../src/helpers/settingsPage.js");
    const withoutFlag = {
      ...baseSettings,
      featureFlags: { ...baseSettings.featureFlags }
    };
    delete withoutFlag.featureFlags.navCacheResetButton;
    currentFlags = withoutFlag.featureFlags;
    renderSettingsControls(withoutFlag, [], tooltipMap);
    expect(document.getElementById("feature-nav-cache-reset-button")).toBeTruthy();
  });
});

describe("initializeSettingsPage", () => {
  it("shows error and skips toggles when navigation items fail", async () => {
    vi.resetModules();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const showSettingsError = vi.fn();
    vi.doMock("../../src/helpers/showSettingsError.js", () => ({
      showSettingsError
    }));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn().mockResolvedValue(baseSettings),
      isEnabled: vi.fn()
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems: vi.fn().mockRejectedValueOnce(new Error("nav fail"))
    }));
    const onDomReady = vi.fn();
    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady }));
    document.body.appendChild(
      Object.assign(document.createElement("div"), { id: "settings-error-popup" })
    );
    await import("../../src/helpers/settingsPage.js");
    const init = onDomReady.mock.calls[0][0];
    await init();
    const popup = document.getElementById("settings-error-popup");
    expect(popup.style.display).toBe("block");
    expect(showSettingsError).toHaveBeenCalled();
    expect(document.querySelectorAll("#game-mode-toggle-container input")).toHaveLength(0);
    consoleError.mockRestore();
  });

  it("renders game mode toggles when cache load fails", async () => {
    vi.resetModules();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const navItems = [
      {
        id: 1,
        url: "classic.html",
        category: "mainMenu",
        order: 10,
        isHidden: false,
        gameModeId: 1
      }
    ];
    const modes = [{ id: 1, name: "Classic", category: "mainMenu" }];
    vi.doMock("../../src/helpers/navigationCache.js", () => ({
      load: vi.fn().mockRejectedValue(new Error("cache error")),
      save: vi.fn()
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadNavigationItems: vi
        .fn()
        .mockResolvedValue(navItems.map((item) => ({ ...item, ...modes[0] }))),
      updateNavigationItemHidden: vi.fn()
    }));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn().mockResolvedValue(baseSettings),
      isEnabled: vi.fn()
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn().mockResolvedValue(() => {}),
      getTooltips: vi.fn().mockResolvedValue({})
    }));
    vi.doMock("../../src/helpers/displayMode.js", () => ({
      applyDisplayMode: vi.fn()
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference: vi.fn()
    }));
    vi.doMock("../../src/helpers/viewportDebug.js", () => ({
      toggleViewportSimulation: vi.fn()
    }));
    vi.doMock("../../src/helpers/tooltipOverlayDebug.js", () => ({
      toggleTooltipOverlayDebug: vi.fn()
    }));
    vi.doMock("../../src/helpers/layoutDebugPanel.js", () => ({
      toggleLayoutDebugPanel: vi.fn()
    }));
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const onDomReady = vi.fn();
    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady }));
    await import("../../src/helpers/settingsPage.js");
    const init = onDomReady.mock.calls[0][0];
    await init();
    const checkboxes = document.querySelectorAll("#game-mode-toggle-container input");
    expect(checkboxes).toHaveLength(1);
    expect(document.getElementById("mode-1")).toBeTruthy();
    consoleError.mockRestore();
  });
});

describe("renderWithFallbacks", () => {
  it("shows error when game modes are missing", async () => {
    const { renderWithFallbacks } = await import("../../src/helpers/settingsPage.js");
    renderWithFallbacks({ settings: baseSettings, gameModes: [], tooltipMap: {} });
    const errorEl = document.querySelector("#game-mode-toggle-container .settings-section-error");
    expect(errorEl?.textContent).toBe(
      "Game Modes could not be loaded. Please check your connection or try again later."
    );
  });

  it("shows error when feature flags are missing", async () => {
    const badSettings = { ...baseSettings };
    // remove featureFlags to trigger error
    delete badSettings.featureFlags;
    const { renderWithFallbacks } = await import("../../src/helpers/settingsPage.js");
    renderWithFallbacks({
      settings: badSettings,
      gameModes: [{ id: 1, name: "Classic", category: "mainMenu" }],
      tooltipMap: {}
    });
    const errorEl = document.querySelector("#feature-flags-container .settings-section-error");
    expect(errorEl?.textContent).toBe(
      "Advanced Settings could not be loaded. Please check your connection or try again later."
    );
  });
});
