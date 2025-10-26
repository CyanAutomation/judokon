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

describe("setFlag", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("persists updates when settings.featureFlags is null", async () => {
    vi.resetModules();
    const [flagName] = Object.keys(DEFAULT_SETTINGS.featureFlags);
    if (!flagName) {
      throw new Error("DEFAULT_SETTINGS.featureFlags must define at least one flag for this test.");
    }

    const loadSettings = vi.fn().mockResolvedValue({
      ...DEFAULT_SETTINGS,
      featureFlags: null
    });
    const updateSetting = vi.fn().mockImplementation(async (key, flags) => {
      expect(key).toBe("featureFlags");
      return {
        ...DEFAULT_SETTINGS,
        featureFlags: flags
      };
    });
    const setCachedSettings = vi.fn();

    vi.doMock("../../src/config/loadSettings.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ updateSetting }));
    vi.doMock("../../src/helpers/settingsCache.js", () => ({ setCachedSettings }));

    try {
      const { setFlag } = await import("../../src/helpers/featureFlags.js");
      const result = await setFlag(flagName, true);

      expect(loadSettings).toHaveBeenCalledTimes(1);
      expect(updateSetting).toHaveBeenCalledWith(
        "featureFlags",
        expect.objectContaining({
          [flagName]: expect.objectContaining({ enabled: true })
        })
      );
      expect(result.featureFlags[flagName].enabled).toBe(true);
    } finally {
      vi.doUnmock("../../src/config/loadSettings.js");
      vi.doUnmock("../../src/helpers/settingsStorage.js");
      vi.doUnmock("../../src/helpers/settingsCache.js");
    }
  });
});

describe("enableFlag", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("swallows persistence rejection to avoid unhandled rejections", async () => {
    vi.resetModules();
    const unhandled = [];
    const captureUnhandled = (reason) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", captureUnhandled);

    const loadSettings = vi.fn().mockResolvedValue({
      ...DEFAULT_SETTINGS,
      featureFlags: { ...DEFAULT_SETTINGS.featureFlags }
    });
    const updateSetting = vi.fn().mockRejectedValue(new Error("persist failed"));
    const setCachedSettings = vi.fn();

    vi.doMock("../../src/config/loadSettings.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ updateSetting }));
    vi.doMock("../../src/helpers/settingsCache.js", () => ({ setCachedSettings }));

    try {
      const featureFlagsModule = await import("../../src/helpers/featureFlags.js");
      const flagName = Object.keys(DEFAULT_SETTINGS.featureFlags)[0] || "enableTestMode";

      featureFlagsModule.enableFlag(flagName);

      await vi.runAllTimersAsync();

      expect(featureFlagsModule.isEnabled(flagName)).toBe(true);
      expect(unhandled).toHaveLength(0);
      expect(loadSettings).toHaveBeenCalledTimes(1);
      expect(updateSetting).toHaveBeenCalledWith("featureFlags", expect.any(Object));
    } finally {
      process.removeListener("unhandledRejection", captureUnhandled);
      vi.doUnmock("../../src/config/loadSettings.js");
      vi.doUnmock("../../src/helpers/settingsStorage.js");
      vi.doUnmock("../../src/helpers/settingsCache.js");
    }
  });
});
