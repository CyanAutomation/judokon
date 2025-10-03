import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const modulePath = "../../src/helpers/settingsPage.js";

const mockedModuleIds = [
  "../../src/helpers/domReady.js",
  "../../src/helpers/featureFlags.js",
  "../../src/helpers/settingsStorage.js",
  "../../src/helpers/tooltip.js",
  "../../src/helpers/gameModeUtils.js",
  "../../src/helpers/showSettingsError.js",
  "../../src/helpers/displayMode.js",
  "../../src/helpers/viewTransition.js",
  "../../src/helpers/motionUtils.js",
  "../../src/helpers/viewportDebug.js",
  "../../src/helpers/tooltipOverlayDebug.js",
  "../../src/helpers/layoutDebugPanel.js",
  "../../src/helpers/showSnackbar.js",
  "../../src/helpers/settings/applyInitialValues.js",
  "../../src/helpers/settings/listenerUtils.js",
  "../../src/helpers/settings/makeHandleUpdate.js",
  "../../src/helpers/settings/createResetModal.js",
  "../../src/helpers/settings/attachResetListener.js",
  "../../src/helpers/settings/syncDisplayMode.js",
  "../../src/helpers/settings/renderGameModes.js",
  "../../src/helpers/settings/renderFeatureFlags.js"
];

const setupBrowserModuleMocks = () => {
  vi.doMock("../../src/helpers/domReady.js", () => ({
    onDomReady: vi.fn()
  }));
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: {} }),
    isEnabled: vi.fn().mockReturnValue(false)
  }));
  vi.doMock("../../src/helpers/settingsStorage.js", () => ({
    resetSettings: vi.fn(),
    updateSetting: vi.fn().mockResolvedValue({}),
    loadSettings: vi.fn().mockResolvedValue({})
  }));
  vi.doMock("../../src/helpers/tooltip.js", () => ({
    initTooltips: vi.fn().mockResolvedValue(vi.fn()),
    getTooltips: vi.fn().mockResolvedValue({})
  }));
  vi.doMock("../../src/helpers/gameModeUtils.js", () => ({
    loadGameModes: vi.fn().mockResolvedValue([])
  }));
  vi.doMock("../../src/helpers/showSettingsError.js", () => ({
    showSettingsError: vi.fn()
  }));
  vi.doMock("../../src/helpers/displayMode.js", () => ({
    applyDisplayMode: vi.fn()
  }));
  vi.doMock("../../src/helpers/viewTransition.js", () => ({
    withViewTransition: vi.fn((callback) => callback())
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
  vi.doMock("../../src/helpers/showSnackbar.js", () => ({
    showSnackbar: vi.fn()
  }));
  vi.doMock("../../src/helpers/settings/applyInitialValues.js", () => ({
    applyInitialControlValues: vi.fn()
  }));
  vi.doMock("../../src/helpers/settings/listenerUtils.js", () => ({
    attachToggleListeners: vi.fn()
  }));
  vi.doMock("../../src/helpers/settings/makeHandleUpdate.js", () => ({
    makeHandleUpdate: vi.fn(() => vi.fn())
  }));
  vi.doMock("../../src/helpers/settings/createResetModal.js", () => ({
    createResetModal: vi.fn(() => ({
      open: vi.fn()
    }))
  }));
  vi.doMock("../../src/helpers/settings/attachResetListener.js", () => ({
    attachResetListener: vi.fn()
  }));
  vi.doMock("../../src/helpers/settings/syncDisplayMode.js", () => ({
    syncDisplayMode: vi.fn((current) => current)
  }));
  vi.doMock("../../src/helpers/settings/renderGameModes.js", () => ({
    renderGameModes: vi.fn()
  }));
  vi.doMock("../../src/helpers/settings/renderFeatureFlags.js", () => ({
    renderFeatureFlags: vi.fn()
  }));
};

const removeModuleMocks = () => {
  mockedModuleIds.forEach((id) => {
    vi.doUnmock(id);
  });
};

const originalAddEventListener = document.addEventListener.bind(document);
const originalRemoveEventListener = document.removeEventListener.bind(document);

const trackedSettingsReadyListeners = new Set();

describe("settingsReadyPromise in browser-like environments", () => {
  beforeEach(() => {
    setupBrowserModuleMocks();
    trackedSettingsReadyListeners.clear();
    vi.spyOn(document, "addEventListener").mockImplementation((type, listener, options) => {
      if (type === "settings:ready") {
        trackedSettingsReadyListeners.add(listener);
      }
      return originalAddEventListener(type, listener, options);
    });
    vi.spyOn(document, "removeEventListener").mockImplementation((type, listener, options) => {
      if (type === "settings:ready") {
        trackedSettingsReadyListeners.delete(listener);
      }
      return originalRemoveEventListener(type, listener, options);
    });
  });

  afterEach(() => {
    trackedSettingsReadyListeners.forEach((listener) => {
      originalRemoveEventListener("settings:ready", listener);
    });
    trackedSettingsReadyListeners.clear();
    vi.restoreAllMocks();
    removeModuleMocks();
    vi.resetModules();
    if ("settingsReadyPromise" in window) {
      delete window.settingsReadyPromise;
    }
    document.body.innerHTML = "";
  });

  const renderReadyEvent = (module) => {
    const { renderSettingsControls } = module;
    const defaultSettings = {
      displayMode: "standard",
      motionEffects: "off",
      featureFlags: {}
    };
    renderSettingsControls(defaultSettings, [], {});
  };

  it("waits for the settings:ready event before resolving", async () => {
    const module = await import(modulePath);
    const { settingsReadyPromise } = module;

    let state = "pending";
    const trackedPromise = settingsReadyPromise.then(() => {
      state = "resolved";
    });

    // Allow any synchronous microtasks to flush to detect premature resolution.
    await Promise.resolve();
    expect(state).toBe("pending");

    renderReadyEvent(module);

    await expect(trackedPromise).resolves.toBeUndefined();
    expect(state).toBe("resolved");
  });

  it("resolves immediately if settings:ready has already been dispatched", async () => {
    const module = await import(modulePath);

    renderReadyEvent(module);

    const { settingsReadyPromise } = module;
    const onResolve = vi.fn();
    settingsReadyPromise.then(onResolve);

    await Promise.resolve();
    expect(onResolve).toHaveBeenCalledTimes(1);
    await expect(settingsReadyPromise).resolves.toBeInstanceOf(Event);
  });

  it("exposes the readiness promise on window for tests", async () => {
    const module = await import(modulePath);
    const { settingsReadyPromise } = module;

    expect(window.settingsReadyPromise).toBe(settingsReadyPromise);

    renderReadyEvent(module);
    await settingsReadyPromise;
  });
});
