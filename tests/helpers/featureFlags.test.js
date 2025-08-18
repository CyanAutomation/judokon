import { describe, it, expect, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../src/config/settingsDefaults.js";

/**
 * @fileoverview
 * Unit tests for feature flag initialization.
 * Ensures defaults are used when settings fail to load and that change events fire.
 */

describe("initFeatureFlags", () => {
  it("falls back to defaults and emits change on load failure", async () => {
    vi.resetModules();
    vi.doMock("../../src/config/loadSettings.js", () => ({
      loadSettings: vi.fn().mockRejectedValue(new Error("fail"))
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      updateSetting: vi.fn()
    }));
    const { initFeatureFlags, featureFlagsEmitter, isEnabled } = await import(
      "../../src/helpers/featureFlags.js"
    );

    const changeSpy = vi.fn();
    featureFlagsEmitter.addEventListener("change", changeSpy);

    const settings = await initFeatureFlags();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(changeSpy).toHaveBeenCalledTimes(1);
    expect(changeSpy.mock.calls[0][0].detail.flag).toBeNull();

    for (const flag of Object.keys(DEFAULT_SETTINGS.featureFlags)) {
      expect(isEnabled(flag)).toBe(DEFAULT_SETTINGS.featureFlags[flag].enabled);
    }
  });
});
