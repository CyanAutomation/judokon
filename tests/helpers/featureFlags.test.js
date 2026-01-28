import { describe, it, expect, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { DEFAULT_SETTINGS } from "../../src/config/settingsDefaults.js";

/**
 * @fileoverview
 * Unit tests for feature flag initialization.
 * Ensures defaults are used when settings fail to load and that change events fire.
 */

describe("initFeatureFlags", () => {
  it("falls back to defaults and emits change on load failure", async () => {
    vi.resetModules();
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      loadSettings: vi.fn().mockRejectedValue(new Error("fail")),
      saveSettings: vi.fn()
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

  it("does not throw when CustomEvent is unavailable", async () => {
    vi.resetModules();
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "CustomEvent");
    Object.defineProperty(globalThis, "CustomEvent", {
      value: undefined,
      configurable: true,
      writable: true
    });

    const loadSettings = vi.fn().mockResolvedValue({
      ...DEFAULT_SETTINGS,
      featureFlags: { ...DEFAULT_SETTINGS.featureFlags }
    });
    const saveSettings = vi.fn().mockResolvedValue();
    const setCachedSettings = vi.fn();

    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings, saveSettings }));
    vi.doMock("../../src/helpers/settingsCache.js", () => ({ setCachedSettings }));

    try {
      const { initFeatureFlags, featureFlagsEmitter, setFlag } = await import(
        "../../src/helpers/featureFlags.js"
      );

      const dispatchSpy = vi
        .spyOn(featureFlagsEmitter, "dispatchEvent")
        .mockImplementation((event) => {
          // Verify that fallback event structure is used when CustomEvent is unavailable
          expect(typeof CustomEvent).not.toBe("function");
          if (typeof Event === "function") {
            expect(event).toBeInstanceOf(Event);
          }
          expect(event.constructor).not.toBe(CustomEvent);
          return true;
        });

      await initFeatureFlags();

      const [flagName] = Object.keys(DEFAULT_SETTINGS.featureFlags);
      await setFlag(flagName, true);

      expect(dispatchSpy).toHaveBeenCalled();
      for (const [event] of dispatchSpy.mock.calls) {
        expect(event).toMatchObject({ type: "change", detail: expect.any(Object) });
        expect(event.detail).toHaveProperty("flag");
      }
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, "CustomEvent", originalDescriptor);
      } else {
        delete globalThis.CustomEvent;
      }
      vi.doUnmock("../../src/helpers/settingsStorage.js");
      vi.doUnmock("../../src/helpers/settingsCache.js");
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
    const saveSettings = vi.fn().mockResolvedValue();
    const setCachedSettings = vi.fn();

    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings, saveSettings }));
    vi.doMock("../../src/helpers/settingsCache.js", () => ({ setCachedSettings }));

    try {
      const { setFlag } = await import("../../src/helpers/featureFlags.js");
      const result = await setFlag(flagName, true);

      expect(loadSettings).toHaveBeenCalledTimes(1);
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          featureFlags: expect.objectContaining({
            [flagName]: expect.objectContaining({ enabled: true })
          })
        })
      );
      expect(result.featureFlags[flagName].enabled).toBe(true);
    } finally {
      vi.doUnmock("../../src/helpers/settingsStorage.js");
      vi.doUnmock("../../src/helpers/settingsCache.js");
    }
  });
});

describe("enableFlag", () => {
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    timers.cleanup();
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
    const saveSettings = vi.fn().mockRejectedValue(new Error("persist failed"));
    const setCachedSettings = vi.fn();

    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings, saveSettings }));
    vi.doMock("../../src/helpers/settingsCache.js", () => ({ setCachedSettings }));

    try {
      const featureFlagsModule = await import("../../src/helpers/featureFlags.js");
      const flagName = Object.keys(DEFAULT_SETTINGS.featureFlags)[0] || "enableTestMode";

      featureFlagsModule.enableFlag(flagName);

      await vi.runAllTimersAsync();

      expect(featureFlagsModule.isEnabled(flagName)).toBe(true);
      expect(unhandled).toHaveLength(0);
      expect(loadSettings).toHaveBeenCalledTimes(1);
      expect(saveSettings).toHaveBeenCalledWith(expect.any(Object));
    } finally {
      process.removeListener("unhandledRejection", captureUnhandled);
      vi.doUnmock("../../src/helpers/settingsStorage.js");
      vi.doUnmock("../../src/helpers/settingsCache.js");
    }
  });
});
