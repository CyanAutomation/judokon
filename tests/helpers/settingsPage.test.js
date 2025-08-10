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

let currentFlags = baseSettings.featureFlags;

beforeEach(() => {
  resetDom();
  document.body.appendChild(createSettingsDom());
  vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips: vi.fn() }));
  vi.doMock("../../src/helpers/displayMode.js", () => ({ applyDisplayMode: vi.fn() }));
  vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference: vi.fn() }));
  vi.doMock("../../src/helpers/viewportDebug.js", () => ({ toggleViewportSimulation: vi.fn() }));
  vi.doMock("../../src/helpers/tooltipOverlayDebug.js", () => ({
    toggleTooltipOverlayDebug: vi.fn()
  }));
  vi.doMock("../../src/helpers/layoutDebugPanel.js", () => ({ toggleLayoutDebugPanel: vi.fn() }));
  vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: vi.fn() }));
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    isEnabled: (flag) => currentFlags[flag]?.enabled ?? false
  }));
});

describe("renderSettingsUI", () => {
  it("renders checkboxes for all modes", async () => {
    const gameModes = [
      { id: 1, name: "Classic", category: "mainMenu", order: 10 },
      { id: 2, name: "Blitz", category: "bonus", order: 20 },
      { id: 3, name: "Dojo", category: "mainMenu", order: 30 }
    ];
    const { renderSettingsUI } = await import("../../src/helpers/settingsPage.js");
    renderSettingsUI(baseSettings, gameModes, tooltipMap);
    const container = document.getElementById("game-mode-toggle-container");
    const checkboxes = container.querySelectorAll("input[type='checkbox']");
    expect(checkboxes).toHaveLength(3);
  });

  it("updates navigation hidden state when a mode is toggled", async () => {
    const gameModes = [{ id: 1, name: "Classic", category: "mainMenu", isHidden: false }];
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    const updateNavigationItemHidden = vi.fn().mockResolvedValue([]);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      updateSetting,
      loadSettings: vi.fn(),
      resetSettings: vi.fn()
    }));
    vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
      updateNavigationItemHidden,
      loadNavigationItems: vi.fn(),
      loadGameModes: vi.fn()
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar: vi.fn() }));
    const { renderSettingsUI } = await import("../../src/helpers/settingsPage.js");
    renderSettingsUI(baseSettings, gameModes, tooltipMap);
    const input = document.getElementById("mode-1");
    input.checked = false;
    input.dispatchEvent(new Event("change"));
    await Promise.resolve();
    await Promise.resolve();
    expect(updateNavigationItemHidden).toHaveBeenCalledWith(1, true);
  });

  it("persists feature flag changes", async () => {
    const updateSetting = vi.fn().mockResolvedValue(baseSettings);
    vi.doMock("../../src/helpers/settingsUtils.js", () => ({
      updateSetting,
      loadSettings: vi.fn(),
      resetSettings: vi.fn()
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar: vi.fn() }));
    const { renderSettingsUI } = await import("../../src/helpers/settingsPage.js");
    renderSettingsUI(baseSettings, [], tooltipMap);
    const input = document.querySelector("#feature-random-stat-mode");
    input.checked = false;
    input.dispatchEvent(new Event("change"));
    await Promise.resolve();
    await Promise.resolve();
    expect(updateSetting).toHaveBeenCalledWith("featureFlags", {
      ...baseSettings.featureFlags,
      randomStatMode: { enabled: false }
    });
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
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));
    vi.doMock("../../src/helpers/navigationCache.js", () => ({ reset: resetNavigationCache }));
    currentFlags = settingsWithButton.featureFlags;
    const { renderSettingsUI } = await import("../../src/helpers/settingsPage.js");
    renderSettingsUI(settingsWithButton, [], tooltipMap);
    await Promise.resolve();
    await Promise.resolve();
    const btn = document.getElementById("nav-cache-reset-button");
    expect(btn).toBeTruthy();
    btn.dispatchEvent(new Event("click"));
    expect(resetNavigationCache).toHaveBeenCalled();
    expect(populateNavbar).toHaveBeenCalled();
    expect(showSnackbar).toHaveBeenCalledWith("Navigation cache cleared");
  });
});
