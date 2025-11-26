import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { createSettingsDom, resetDom } from "../utils/testUtils.js";
import { createSimpleHarness } from "./integrationHarness.js";
import { flushUnhandledRejections } from "../utils/flushUnhandledRejections.js";

// ===== Top-level vi.hoisted() for shared mock state (MUST be before baseSettings) =====
const {
  mockInitFeatureFlags,
  mockIsEnabled,
  mockLoadGameModes,
  mockApplyDisplayMode,
  mockApplyMotionPreference,
  mockToggleTooltipOverlayDebug,
  mockToggleLayoutDebugPanel,
  mockOnDomReady,
  mockUpdateSetting,
  mockUpdateNavigationItemHidden,
  mockGetTooltips,
  mockInitTooltips,
  mockResetSettings,
  mockShowSnackbar,
  mockShowSettingsError,
  mockLoadNavigationItems
} = vi.hoisted(() => ({
  mockInitFeatureFlags: vi.fn(),
  mockIsEnabled: vi.fn(),
  mockLoadGameModes: vi.fn(),
  mockApplyDisplayMode: vi.fn(),
  mockApplyMotionPreference: vi.fn(),
  mockToggleTooltipOverlayDebug: vi.fn(),
  mockToggleLayoutDebugPanel: vi.fn(),
  mockOnDomReady: vi.fn(),
  mockUpdateSetting: vi.fn(),
  mockUpdateNavigationItemHidden: vi.fn(),
  mockGetTooltips: vi.fn(),
  mockInitTooltips: vi.fn(),
  mockResetSettings: vi.fn(),
  mockShowSnackbar: vi.fn(),
  mockShowSettingsError: vi.fn(),
  mockLoadNavigationItems: vi.fn()
}));

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
  "settings.tooltipOverlayDebug.label": "Tooltip Overlay Debug",
  "settings.tooltipOverlayDebug.description": "Shows bounding boxes for tooltip targets",
  "settings.layoutDebugPanel.label": "Layout Debug Panel",
  "settings.layoutDebugPanel.description":
    "Displays CSS grid and flex outlines for debugging layout issues"
};

// Shared mutable state for feature flags (used by mocked modules)
let currentFlags = baseSettings.featureFlags;

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/displayMode.js", () => ({
  applyDisplayMode: mockApplyDisplayMode,
  normalizeDisplayMode: vi.fn((mode) => mode)
}));

vi.mock("../../src/helpers/motionUtils.js", () => ({
  applyMotionPreference: mockApplyMotionPreference
}));

vi.mock("../../src/helpers/tooltipOverlayDebug.js", () => ({
  toggleTooltipOverlayDebug: mockToggleTooltipOverlayDebug
}));

vi.mock("../../src/helpers/layoutDebugPanel.js", () => ({
  toggleLayoutDebugPanel: mockToggleLayoutDebugPanel
}));

vi.mock("../../src/helpers/domReady.js", () => ({
  onDomReady: mockOnDomReady
}));

vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: mockIsEnabled,
  initFeatureFlags: mockInitFeatureFlags
}));

vi.mock("../../src/helpers/gameModeUtils.js", () => ({
  loadGameModes: mockLoadGameModes,
  updateNavigationItemHidden: mockUpdateNavigationItemHidden,
  loadNavigationItems: mockLoadNavigationItems
}));

vi.mock("../../src/helpers/settingsStorage.js", () => ({
  updateSetting: mockUpdateSetting,
  loadSettings: vi.fn(),
  resetSettings: mockResetSettings
}));

vi.mock("../../src/helpers/tooltip.js", () => ({
  getTooltips: mockGetTooltips,
  initTooltips: mockInitTooltips
}));

vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: mockShowSnackbar,
  updateSnackbar: vi.fn()
}));

vi.mock("../../src/helpers/showSettingsError.js", () => ({
  showSettingsError: mockShowSettingsError
}));

// ===== Helper to reset all mocks to defaults =====
function resetAllMocks() {
  mockInitFeatureFlags.mockReset().mockResolvedValue(baseSettings);
  mockIsEnabled.mockReset().mockImplementation((flag) => currentFlags[flag]?.enabled ?? false);
  // Note: mockLoadGameModes starts with rejection for default behavior
  mockLoadGameModes.mockReset();
  mockLoadGameModes.mockRejectedValueOnce(new Error("nav fail"));
  mockApplyDisplayMode.mockReset();
  mockApplyMotionPreference.mockReset();
  mockToggleTooltipOverlayDebug.mockReset();
  mockToggleLayoutDebugPanel.mockReset();
  mockOnDomReady.mockReset();
  mockUpdateSetting.mockReset().mockResolvedValue(baseSettings);
  mockUpdateNavigationItemHidden.mockReset().mockResolvedValue([]);
  mockGetTooltips.mockReset().mockResolvedValue({});
  mockInitTooltips.mockReset().mockResolvedValue(() => {});
  mockResetSettings.mockReset();
  mockShowSnackbar.mockReset();
  mockShowSettingsError.mockReset();
  mockLoadNavigationItems.mockReset();
}

// ===== Test setup/teardown =====
let harness;

beforeEach(async () => {
  resetAllMocks();
  currentFlags = baseSettings.featureFlags;
  harness = createSimpleHarness();
  await harness.setup();
  resetDom();
  localStorage.clear();
  document.body.appendChild(createSettingsDom());
});

afterEach(async () => {
  if (harness) {
    await harness.cleanup();
  }
});

describe("fetchSettingsData", () => {
  it("rejects on fetch failure", async () => {
    // Configure mocks for this specific test
    mockInitFeatureFlags.mockRejectedValue(new Error("fail"));
    mockLoadGameModes.mockResolvedValue([]);

    // Create fresh harness and import with new mock config
    const testHarness = createSimpleHarness();
    await testHarness.setup();

    const { fetchSettingsData } = await import("../../src/helpers/settingsPage.js");
    await expect(fetchSettingsData()).rejects.toThrow("Failed to fetch settings data");

    await testHarness.cleanup();
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
    const gameModes = [
      { id: 1, name: "Classic", category: "mainMenu", order: 10 },
      { id: 2, name: "Blitz", category: "bonus", order: 20 },
      { id: 3, name: "Dojo", category: "mainMenu", order: 30 }
    ];
    // Configure mocks for this test
    const updateSettingFn = vi.fn().mockResolvedValue(baseSettings);
    const updateNavFn = vi.fn().mockResolvedValue([]);
    mockUpdateSetting.mockImplementation(updateSettingFn);
    mockUpdateNavigationItemHidden.mockImplementation(updateNavFn);

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
      handleUpdate: updateSettingFn
    });
    expect(updateNavFn).toHaveBeenCalledWith(1, true);
  });

  it("logs a warning when tooltip initialization fails", async () => {
    const tooltipError = new Error("tooltip init failed");
    const unhandled = [];
    const captureUnhandled = (reason) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", captureUnhandled);

    let warnSpy;
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Configure mocks for this test
    mockInitTooltips.mockRejectedValue(tooltipError);

    try {
      const loggerModule = await import("../../src/helpers/logger.js");
      warnSpy = vi.spyOn(loggerModule, "warn").mockImplementation(() => {});
      const { renderSettingsControls } = await import("../../src/helpers/settingsPage.js");

      renderSettingsControls(baseSettings, [], tooltipMap);

      await flushUnhandledRejections();

      expect(unhandled).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(
        "Failed to initialize tooltips for settings switches",
        tooltipError
      );
    } finally {
      if (warnSpy) warnSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      process.removeListener("unhandledRejection", captureUnhandled);
    }
  });

  it("skips navigation updates when persistence fails", async () => {
    const gameModes = [{ id: 1, name: "Classic", category: "mainMenu", order: 10 }];
    const revertSpy = vi.fn();
    const updateSettingImpl = vi.fn().mockImplementation((key, value, revert) => {
      if (typeof revert === "function") {
        revertSpy();
        revert();
      }
      return Promise.reject(new Error("persist failed"));
    });
    const updateNavFn = vi.fn().mockResolvedValue([]);

    // Configure mocks for this test
    mockUpdateSetting.mockImplementation(updateSettingImpl);
    mockUpdateNavigationItemHidden.mockImplementation(updateNavFn);

    const { handleGameModeChange } = await import("../../src/helpers/settings/gameModeSwitches.js");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = false;
    await handleGameModeChange({
      input,
      mode: gameModes[0],
      label: gameModes[0].name,
      getCurrentSettings: () => ({ gameModes: {} }),
      handleUpdate: updateSettingImpl
    });
    expect(updateSettingImpl).toHaveBeenCalledWith(
      "gameModes",
      { [gameModes[0].id]: false },
      expect.any(Function),
      input
    );
    expect(revertSpy).toHaveBeenCalled();
    expect(updateNavFn).not.toHaveBeenCalled();
    expect(input.checked).toBe(true);
  });

  it("uses the persisted toggle state for delayed navigation updates", async () => {
    const gameModes = [{ id: 1, name: "Classic", category: "mainMenu", order: 10 }];
    let resolveUpdate;
    const updateSettingImpl = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = () => resolve(baseSettings);
        })
    );
    const updateNavFn = vi.fn().mockResolvedValue([]);
    const showSnackbarFn = vi.fn();

    // Configure mocks for this test
    mockUpdateSetting.mockImplementation(updateSettingImpl);
    mockUpdateNavigationItemHidden.mockImplementation(updateNavFn);
    mockShowSnackbar.mockImplementation(showSnackbarFn);

    const { handleGameModeChange } = await import("../../src/helpers/settings/gameModeSwitches.js");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = true;
    const promise = handleGameModeChange({
      input,
      mode: gameModes[0],
      label: gameModes[0].name,
      getCurrentSettings: () => ({ gameModes: {} }),
      handleUpdate: updateSettingImpl
    });
    input.checked = false;
    expect(typeof resolveUpdate).toBe("function");
    resolveUpdate();
    await promise;
    expect(updateNavFn).toHaveBeenCalledWith(1, false);
    expect(showSnackbarFn).toHaveBeenCalledWith("Classic enabled");
  });

  it("reverts the toggle and surfaces errors when navigation updates fail", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const gameModes = [{ id: 1, name: "Classic", category: "mainMenu", order: 10 }];
    const updateSettingImpl = vi.fn().mockResolvedValue(baseSettings);
    const updateNavFn = vi.fn().mockRejectedValue(new Error("nav failed"));
    const showSettingsErrorFn = vi.fn();

    // Configure mocks for this test
    mockUpdateSetting.mockImplementation(updateSettingImpl);
    mockUpdateNavigationItemHidden.mockImplementation(updateNavFn);
    mockShowSettingsError.mockImplementation(showSettingsErrorFn);

    const { handleGameModeChange } = await import("../../src/helpers/settings/gameModeSwitches.js");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = true;
    await expect(
      handleGameModeChange({
        input,
        mode: gameModes[0],
        label: gameModes[0].name,
        getCurrentSettings: () => ({ gameModes: {} }),
        handleUpdate: updateSettingImpl
      })
    ).rejects.toThrow("nav failed");
    expect(updateNavFn).toHaveBeenCalledWith(1, false);
    expect(showSettingsErrorFn).toHaveBeenCalled();
    expect(input.checked).toBe(false);
    consoleError.mockRestore();
  });

  it("persists feature flag changes", async () => {
    const updateSettingImpl = vi.fn().mockResolvedValue(baseSettings);
    mockUpdateSetting.mockImplementation(updateSettingImpl);

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
      handleUpdate: updateSettingImpl
    });
    expect(updateSettingImpl).toHaveBeenCalledWith(
      "featureFlags",
      {
        ...baseSettings.featureFlags,
        enableTestMode: { enabled: true }
      },
      expect.any(Function),
      input
    );
  });

  it("shows transient save status feedback when settings persist", async () => {
    const timers = useCanonicalTimers();
    const updateSettingImpl = vi.fn().mockResolvedValue(baseSettings);
    mockUpdateSetting.mockImplementation(updateSettingImpl);

    try {
      const { renderSettingsControls } = await import("../../src/helpers/settingsPage.js");
      renderSettingsControls(baseSettings, [], tooltipMap);
      const status = document.getElementById("settings-save-status");
      const soundToggle = document.getElementById("sound-toggle");

      soundToggle.checked = false;
      soundToggle.dispatchEvent(new Event("change", { bubbles: true }));

      await Promise.resolve();
      expect(status.hidden).toBe(false);
      expect(status.dataset.visible).toBe("true");
      expect(status.textContent).toBe("Saved!");

      await vi.advanceTimersByTimeAsync(2000);
      expect(status.hidden).toBe(true);
      expect(status.textContent).toBe("");
    } finally {
      timers.cleanup();
    }
  });

  it("restores defaults when confirmed", async () => {
    const initFeatureFlagsFn = vi.fn().mockImplementation(async () => {
      currentFlags = baseSettings.featureFlags;
      return baseSettings;
    });
    const showSnackbarFn = vi.fn();

    // Configure mocks for this test
    mockResetSettings.mockReset();
    mockInitFeatureFlags.mockImplementation(initFeatureFlagsFn);
    mockShowSnackbar.mockImplementation(showSnackbarFn);

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
    expect(mockResetSettings).toHaveBeenCalled();
    expect(initFeatureFlagsFn).toHaveBeenCalled();
    expect(showSnackbarFn).toHaveBeenCalledWith("Settings restored to defaults");
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
    delete withoutFlag.featureFlags.layoutDebugPanel;
    currentFlags = withoutFlag.featureFlags;
    renderSettingsControls(withoutFlag, [], tooltipMap);
    const input = document.getElementById("feature-layout-debug-panel");
    expect(input).toBeTruthy();
    expect(input.checked).toBe(false);
  });
});

describe("initializeSettingsPage", () => {
  it("calls onDomReady callback when initialized", async () => {
    const onDomReadyFn = vi.fn();

    // Configure mocks for this test
    mockInitFeatureFlags.mockResolvedValue(baseSettings);
    mockLoadGameModes.mockResolvedValue([{ id: 1, name: "Classic", category: "mainMenu" }]);
    mockOnDomReady.mockImplementation(onDomReadyFn);

    const testHarness = createSimpleHarness();
    await testHarness.setup();

    await import("../../src/helpers/settingsPage.js");
    expect(onDomReadyFn).toHaveBeenCalledTimes(1);
    expect(typeof onDomReadyFn.mock.calls[0][0]).toBe("function");

    await testHarness.cleanup();
  });

  it("renders game mode toggles when cache load succeeds", async () => {
    const onDomReadyFn = vi.fn();

    // Configure mocks for this test
    mockInitFeatureFlags.mockResolvedValue(baseSettings);
    mockLoadGameModes.mockResolvedValue([{ id: 1, name: "Classic", category: "mainMenu" }]);
    mockOnDomReady.mockImplementation(onDomReadyFn);

    const testHarness = createSimpleHarness();
    await testHarness.setup();

    await import("../../src/helpers/settingsPage.js");
    const init = onDomReadyFn.mock.calls[0][0];
    await init();
    const checkboxes = document.querySelectorAll("#game-mode-toggle-container input");
    expect(checkboxes).toHaveLength(1);
    expect(document.getElementById("mode-1")).toBeTruthy();

    await testHarness.cleanup();
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
