import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withMutedConsole } from "../utils/console.js";
import { mount, clearBody } from "./domUtils.js";
import { createSettingsDom } from "../utils/testUtils.js";

vi.mock("../../src/helpers/settings/featureFlagSwitches.js", () => ({
  renderFeatureFlagSwitches: vi.fn()
}));

vi.mock("../../src/helpers/settings/syncFeatureFlags.js", () => ({
  syncFeatureFlags: vi.fn()
}));

vi.mock("../../src/helpers/settings/filterAdvancedSettings.js", () => ({
  reapplyAdvancedSettingsFilter: vi.fn()
}));

import { renderFeatureFlags } from "../../src/helpers/settings/renderFeatureFlags.js";
import { renderFeatureFlagSwitches } from "../../src/helpers/settings/featureFlagSwitches.js";
import { syncFeatureFlags } from "../../src/helpers/settings/syncFeatureFlags.js";
import { reapplyAdvancedSettingsFilter } from "../../src/helpers/settings/filterAdvancedSettings.js";

const renderFeatureFlagSwitchesMock = vi.mocked(renderFeatureFlagSwitches);
const syncFeatureFlagsMock = vi.mocked(syncFeatureFlags);
const reapplyAdvancedSettingsFilterMock = vi.mocked(reapplyAdvancedSettingsFilter);

beforeEach(() => {
  vi.clearAllMocks();
  clearBody();
  const { container } = mount();
  container.appendChild(createSettingsDom());

  renderFeatureFlagSwitchesMock.mockImplementation((target, flags) => {
    target.dataset.testRendered = "true";
    target.dataset.testFlagCount = String(Object.keys(flags).length);
  });
});

afterEach(() => {
  clearBody();
});

describe("renderFeatureFlags", () => {
  it("syncs feature flags and refreshes the fieldset without touching other sections", async () => {
    const currentSettings = { featureFlags: { dojo: true } };
    const getCurrentSettings = vi.fn(() => currentSettings);
    const handleUpdate = vi.fn();
    const tooltipMap = { dojo: "Dojo Toggle" };

    const nextFlags = {
      dojo: { enabled: true },
      kata: { enabled: false }
    };
    syncFeatureFlagsMock.mockReturnValue(nextFlags);

    const featureFlagsContainer = document.getElementById("feature-flags-container");
    const staleItem = document.createElement("div");
    staleItem.className = "settings-item";
    staleItem.dataset.testState = "stale";
    featureFlagsContainer.appendChild(staleItem);

    const generalItemsBefore = document.querySelectorAll(
      "#general-settings-container .settings-item"
    ).length;

    await withMutedConsole(() =>
      renderFeatureFlags(currentSettings, getCurrentSettings, handleUpdate, tooltipMap)
    );

    expect(syncFeatureFlagsMock).toHaveBeenCalledWith(currentSettings);
    expect(renderFeatureFlagSwitchesMock).toHaveBeenCalledWith(
      featureFlagsContainer,
      nextFlags,
      getCurrentSettings,
      handleUpdate,
      tooltipMap
    );
    expect(featureFlagsContainer.dataset.testRendered).toBe("true");
    expect(featureFlagsContainer.dataset.testFlagCount).toBe("2");
    expect(featureFlagsContainer.querySelector('[data-test-state="stale"]')).toBeNull();
    expect(document.querySelectorAll("#general-settings-container .settings-item").length).toBe(
      generalItemsBefore
    );
    expect(reapplyAdvancedSettingsFilterMock).toHaveBeenCalledTimes(1);
  });

  it("passes through an empty feature flag list when sync returns no flags", async () => {
    const currentSettings = { featureFlags: {} };
    const getCurrentSettings = vi.fn(() => currentSettings);
    const handleUpdate = vi.fn();
    const tooltipMap = {};

    syncFeatureFlagsMock.mockReturnValue({});

    const featureFlagsContainer = document.getElementById("feature-flags-container");

    await withMutedConsole(() =>
      renderFeatureFlags(currentSettings, getCurrentSettings, handleUpdate, tooltipMap)
    );

    expect(renderFeatureFlagSwitchesMock).toHaveBeenCalledWith(
      featureFlagsContainer,
      {},
      getCurrentSettings,
      handleUpdate,
      tooltipMap
    );
    expect(featureFlagsContainer.dataset.testFlagCount).toBe("0");
    expect(reapplyAdvancedSettingsFilterMock).toHaveBeenCalledTimes(1);
  });

  it("returns early when the feature flag container is missing", async () => {
    const currentSettings = { featureFlags: { dojo: true } };
    const getCurrentSettings = vi.fn(() => currentSettings);
    const handleUpdate = vi.fn();
    const tooltipMap = { dojo: "Dojo Toggle" };

    const container = document.getElementById("feature-flags-container");
    container.remove();

    await withMutedConsole(() =>
      renderFeatureFlags(currentSettings, getCurrentSettings, handleUpdate, tooltipMap)
    );

    expect(syncFeatureFlagsMock).not.toHaveBeenCalled();
    expect(renderFeatureFlagSwitchesMock).not.toHaveBeenCalled();
    expect(reapplyAdvancedSettingsFilterMock).not.toHaveBeenCalled();
  });
});
