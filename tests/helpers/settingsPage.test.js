import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSettingsDom, resetDom } from "../utils/testUtils.js";
import { createSettingsHarness } from "./integrationHarness.js";

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
    layoutDebugPanel: { enabled: false, tooltipId: "settings.layoutDebugPanel" }
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
    "Displays CSS grid and flex outlines for debugging layout issues"
};

let currentFlags = baseSettings.featureFlags;

// Create harness with all required mocks
const harness = createSettingsHarness({
  mocks: {
    "../../src/helpers/displayMode.js": () => ({ applyDisplayMode: vi.fn() }),
    "../../src/helpers/motionUtils.js": () => ({ applyMotionPreference: vi.fn() }),
    "../../src/helpers/viewportDebug.js": () => ({ toggleViewportSimulation: vi.fn() }),
    "../../src/helpers/tooltipOverlayDebug.js": () => ({
      toggleTooltipOverlayDebug: vi.fn()
    }),
    "../../src/helpers/layoutDebugPanel.js": () => ({ toggleLayoutDebugPanel: vi.fn() }),
    "../../src/helpers/domReady.js": () => ({ onDomReady: vi.fn() }),
    "../../src/helpers/featureFlags.js": () => ({
      isEnabled: (flag) => currentFlags[flag]?.enabled ?? false,
      initFeatureFlags: vi.fn().mockResolvedValue(baseSettings)
    }),
    "../../src/helpers/gameModeUtils.js": () => ({
      loadNavigationItems: vi.fn().mockResolvedValue([])
    })
  }
});

beforeEach(async () => {
  await harness.setup();
  resetDom();
  document.body.appendChild(createSettingsDom());
});

describe("fetchSettingsData", () => {
  it("rejects on fetch failure", async () => {
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn().mockRejectedValue(new Error("fail")),
      isEnabled: vi.fn()
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadGameModes: vi.fn().mockResolvedValue([])
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      getTooltips: vi.fn().mockResolvedValue({}),
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    const testHarness = createSettingsHarness();
    await testHarness.setup();
    const { fetchSettingsData } = await import("../../src/helpers/settingsPage.js");
    await expect(fetchSettingsData()).rejects.toThrow("Failed to fetch settings data");
    await testHarness.cleanup();
  });
});

describe("renderSettingsControls", () => {
  it("renders expected toggles", async () => {
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      getTooltips: vi.fn().mockResolvedValue({}),
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
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
    const gameModes = [
      { id: 1, name: "Classic", category: "mainMenu", order: 10 },
      { id: 2, name: "Blitz", category: "bonus", order: 20 },
      { id: 3, name: "Dojo", category: "mainMenu", order: 30 }
    ];
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
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      getTooltips: vi.fn().mockResolvedValue({}),
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    const testHarness = createSettingsHarness();
    await testHarness.setup();
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
    await testHarness.cleanup();
  });

  it("persists feature flag changes", async () => {
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      updateSetting,
      loadSettings: vi.fn(),
      resetSettings: vi.fn()
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      getTooltips: vi.fn().mockResolvedValue({}),
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    const testHarness = createSettingsHarness();
    await testHarness.setup();
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
    await testHarness.cleanup();
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
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      getTooltips: vi.fn().mockResolvedValue({}),
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    const testHarness = createSettingsHarness();
    await testHarness.setup();
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
    await testHarness.cleanup();
  });

  it("does not duplicate reset listener on reinit", async () => {
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      getTooltips: vi.fn().mockResolvedValue({}),
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    const { renderSettingsControls } = await import("../../src/helpers/settingsPage.js");
    renderSettingsControls(baseSettings, [], tooltipMap);
    const resetButton = document.getElementById("reset-settings-button");
    const addSpy = vi.spyOn(resetButton, "addEventListener");
    renderSettingsControls(baseSettings, [], tooltipMap);
    expect(addSpy).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });

  it("renders missing feature flags from defaults", async () => {
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      getTooltips: vi.fn().mockResolvedValue({}),
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    const { renderSettingsControls } = await import("../../src/helpers/settingsPage.js");
    const withoutFlag = {
      ...baseSettings,
      featureFlags: { ...baseSettings.featureFlags }
    };
    delete withoutFlag.featureFlags.layoutDebugPanel;
    currentFlags = withoutFlag.featureFlags;
    renderSettingsControls(withoutFlag, [], tooltipMap);
    const input = document.getElementById("feature-layout-debug-panel");
    expect(input).toBeTruthy();
    expect(input.checked).toBe(false);
  });
});

describe("initializeSettingsPage", () => {
  it("shows error and skips toggles when navigation items fail", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const showSettingsError = vi.fn();
    const onDomReady = vi.fn();
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
    const testHarness = createSettingsHarness();
    await testHarness.setup();
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
    await testHarness.cleanup();
  });

  it("renders game mode toggles when cache load fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onDomReady = vi.fn();
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn().mockResolvedValue(baseSettings),
      isEnabled: vi.fn()
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      loadGameModes: vi.fn().mockResolvedValue([{ id: 1, name: "Classic", category: "mainMenu" }])
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn().mockResolvedValue(() => {}),
      getTooltips: vi.fn().mockResolvedValue({})
    }));
    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady }));
    const testHarness = createSettingsHarness();
    await testHarness.setup();
    await import("../../src/helpers/settingsPage.js");
    const init = onDomReady.mock.calls[0][0];
    await init();
    const checkboxes = document.querySelectorAll("#game-mode-toggle-container input");
    expect(checkboxes).toHaveLength(1);
    expect(document.getElementById("mode-1")).toBeTruthy();
    consoleError.mockRestore();
    await testHarness.cleanup();
  });
});

describe("renderWithFallbacks", () => {
  it("shows error when game modes are missing", async () => {
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      getTooltips: vi.fn().mockResolvedValue({}),
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    const { renderWithFallbacks } = await import("../../src/helpers/settingsPage.js");
    renderWithFallbacks({ settings: baseSettings, gameModes: [], tooltipMap: {} });
    const errorEl = document.querySelector("#game-mode-toggle-container .settings-section-error");
    expect(errorEl?.textContent).toBe(
      "Game Modes could not be loaded. Please check your connection or try again later."
    );
  });

  it("shows error when feature flags are missing", async () => {
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      getTooltips: vi.fn().mockResolvedValue({}),
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
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
