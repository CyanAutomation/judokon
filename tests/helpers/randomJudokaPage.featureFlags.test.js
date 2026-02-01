import { describe, it, expect, vi } from "vitest";
import { createRandomCardDom } from "../utils/testUtils.js";

const baseSettings = {
  motionEffects: true,
  typewriterEffect: true,
  tooltips: true,
  displayMode: "light",
  fullNavigationMap: true,
  gameModes: {},
  featureFlags: {
    enableTestMode: { enabled: false },
    enableCardInspector: { enabled: false }
  }
};

describe("randomJudokaPage feature flags", () => {
  it("falls back to defaults when matchMedia is unavailable", async () => {
    const originalMatchMedia = window.matchMedia;
    delete window.matchMedia;

    const initFeatureFlags = vi.fn().mockResolvedValue({
      motionEffects: true,
      featureFlags: {
        enableCardInspector: { enabled: false },
        tooltipOverlayDebug: { enabled: false }
      }
    });
    const applyMotionPreference = vi.fn();
    const toggleInspectorPanels = vi.fn();
    const toggleTooltipOverlayDebug = vi.fn();
    const setTestMode = vi.fn();

    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags,
      isEnabled: vi.fn().mockReturnValue(false),
      featureFlagsEmitter: new EventTarget()
    }));
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));
    vi.doMock("../../src/helpers/cardUtils.js", () => ({ toggleInspectorPanels }));
    vi.doMock("../../src/helpers/tooltipOverlayDebug.js", () => ({ toggleTooltipOverlayDebug }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({
      setTestMode,
      isTestModeEnabled: () => false
    }));
    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: vi.fn() }));

    const { initFeatureFlagState } = await import("../../src/helpers/randomJudokaPage.js");
    const state = await initFeatureFlagState();
    expect(state.prefersReducedMotion).toBe(false);
    expect(state.soundEnabled).toBe(true);
    expect(applyMotionPreference).toHaveBeenCalledWith(true);

    window.matchMedia = originalMatchMedia;
    vi.resetModules();
    vi.doUnmock("../../src/helpers/featureFlags.js");
    vi.doUnmock("../../src/helpers/motionUtils.js");
    vi.doUnmock("../../src/helpers/cardUtils.js");
    vi.doUnmock("../../src/helpers/tooltipOverlayDebug.js");
    vi.doUnmock("../../src/helpers/testModeUtils.js");
    vi.doUnmock("../../src/helpers/domReady.js");
  });

  it("applies fallback feature flag values when initialization fails", async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    const initFeatureFlags = vi.fn().mockRejectedValue(new Error("init failed"));
    const isEnabled = vi.fn().mockReturnValue(true);
    const applyMotionPreference = vi.fn();
    const toggleInspectorPanels = vi.fn();
    const toggleTooltipOverlayDebug = vi.fn();
    const setTestMode = vi.fn();
    const setCachedSettings = vi.fn();

    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags,
      isEnabled,
      featureFlagsEmitter: new EventTarget()
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync: vi.fn().mockReturnValue(false)
    }));
    vi.doMock("../../src/helpers/cardUtils.js", () => ({ toggleInspectorPanels }));
    vi.doMock("../../src/helpers/tooltipOverlayDebug.js", () => ({ toggleTooltipOverlayDebug }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({
      setTestMode,
      isTestModeEnabled: () => false
    }));
    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: vi.fn() }));
    vi.doMock("../../src/helpers/settingsCache.js", async () => {
      const actual = await vi.importActual("../../src/helpers/settingsCache.js");
      return {
        ...actual,
        setCachedSettings: setCachedSettings.mockImplementation((settings) =>
          actual.setCachedSettings(settings)
        )
      };
    });

    const { initFeatureFlagState } = await import("../../src/helpers/randomJudokaPage.js");
    const state = await initFeatureFlagState();

    expect(initFeatureFlags).toHaveBeenCalled();
    expect(isEnabled).not.toHaveBeenCalled();
    expect(setCachedSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        sound: true,
        motionEffects: false,
        featureFlags: expect.objectContaining({
          enableTestMode: { enabled: false },
          enableCardInspector: { enabled: false },
          tooltipOverlayDebug: { enabled: false }
        })
      })
    );
    expect(setTestMode).toHaveBeenCalledWith(false);
    expect(applyMotionPreference).toHaveBeenCalledWith(false);
    expect(toggleInspectorPanels).toHaveBeenCalledWith(false);
    expect(toggleTooltipOverlayDebug).toHaveBeenCalledWith(false);
    expect(state.prefersReducedMotion).toBe(true);
    expect(state.soundEnabled).toBe(true);

    window.matchMedia = originalMatchMedia;
    vi.resetModules();
    vi.doUnmock("../../src/helpers/featureFlags.js");
    vi.doUnmock("../../src/helpers/motionUtils.js");
    vi.doUnmock("../../src/helpers/cardUtils.js");
    vi.doUnmock("../../src/helpers/tooltipOverlayDebug.js");
    vi.doUnmock("../../src/helpers/testModeUtils.js");
    vi.doUnmock("../../src/helpers/domReady.js");
    vi.doUnmock("../../src/helpers/settingsCache.js");
  });

  it("respects feature flag overrides when provided", async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    window.__FF_OVERRIDES = {
      enableTestMode: true,
      enableCardInspector: true,
      tooltipOverlayDebug: true
    };

    const initFeatureFlags = vi.fn().mockResolvedValue({
      motionEffects: true,
      featureFlags: {
        enableTestMode: { enabled: false },
        enableCardInspector: { enabled: false },
        tooltipOverlayDebug: { enabled: false }
      }
    });
    const applyMotionPreference = vi.fn();
    const toggleInspectorPanels = vi.fn();
    const toggleTooltipOverlayDebug = vi.fn();
    const setTestMode = vi.fn();

    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags,
      isEnabled: vi.fn(),
      featureFlagsEmitter: new EventTarget()
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync: vi.fn().mockReturnValue(false)
    }));
    vi.doMock("../../src/helpers/cardUtils.js", () => ({ toggleInspectorPanels }));
    vi.doMock("../../src/helpers/tooltipOverlayDebug.js", () => ({ toggleTooltipOverlayDebug }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({
      setTestMode,
      isTestModeEnabled: () => false
    }));
    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: vi.fn() }));

    const { initFeatureFlagState } = await import("../../src/helpers/randomJudokaPage.js");
    await initFeatureFlagState();

    expect(setTestMode).toHaveBeenCalledWith(true);
    expect(toggleInspectorPanels).toHaveBeenCalledWith(true);
    expect(toggleTooltipOverlayDebug).toHaveBeenCalledWith(true);

    delete window.__FF_OVERRIDES;
    window.matchMedia = originalMatchMedia;
    vi.resetModules();
    vi.doUnmock("../../src/helpers/featureFlags.js");
    vi.doUnmock("../../src/helpers/motionUtils.js");
    vi.doUnmock("../../src/helpers/cardUtils.js");
    vi.doUnmock("../../src/helpers/tooltipOverlayDebug.js");
    vi.doUnmock("../../src/helpers/testModeUtils.js");
    vi.doUnmock("../../src/helpers/domReady.js");
  });

  it("storage event toggles card inspector", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      card.dataset.cardJson = JSON.stringify({ id: 1 });
      const inner = document.createElement("div");
      inner.className = "judoka-card";
      inner.innerHTML =
        '<div class="card-top-bar"></div><div class="card-portrait"></div><div class="card-stats"></div><div class="signature-move-container" data-tooltip-id="ui.signatureBar"></div>';
      card.appendChild(inner);
      container.appendChild(card);
    });
    const fetchJson = vi.fn().mockResolvedValue([]);
    const loadSettings = vi.fn().mockResolvedValue(baseSettings);
    const applyMotionPreference = vi.fn();

    const loadGokyoLookup = vi.fn().mockResolvedValue({});
    const renderJudokaCard = vi.fn().mockResolvedValue();
    const preloadRandomCardData = vi
      .fn()
      .mockResolvedValue({ judokaData: [], gokyoData: [], error: null });

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard,
      preloadRandomCardData,
      createHistoryManager: vi.fn(() => ({ add: vi.fn(), get: vi.fn(() => []) }))
    }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    vi.doMock("../../src/helpers/constants.js", async () => ({
      ...(await vi.importActual("../../src/helpers/constants.js")),
      DATA_DIR: ""
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings }));
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const drawBtn = document.getElementById("draw-card-btn");
    drawBtn.fallbackDelayMs = 0;
    drawBtn.timers = { setTimeout: () => 0, clearTimeout: () => {} };
    drawBtn.click();
    await window.__TEST_API.randomJudoka.resolveDrawPipeline();

    expect(container.querySelector(".debug-panel")).toBeNull();

    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "settings",
        newValue: JSON.stringify({
          ...baseSettings,
          featureFlags: {
            ...baseSettings.featureFlags,
            enableCardInspector: {
              ...baseSettings.featureFlags.enableCardInspector,
              enabled: true
            }
          }
        })
      })
    );
    expect(container.querySelector(".debug-panel")).toBeTruthy();
  });

  it("updates motion and sound preferences when settings change", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const generateRandomCard = vi.fn().mockImplementation(async (_c, _g, container) => {
      const card = document.createElement("div");
      card.className = "card-container";
      container.appendChild(card);
      return { firstname: "A", surname: "Tester" };
    });
    const fetchJson = vi.fn().mockResolvedValue([]);

    const applyMotionPreference = vi.fn();
    const shouldReduceMotionSync = vi.fn().mockReturnValue(false);
    const loadGokyoLookup = vi.fn().mockResolvedValue({});
    const renderJudokaCard = vi.fn().mockResolvedValue();
    const preloadRandomCardData = vi
      .fn()
      .mockResolvedValue({ judokaData: [], gokyoData: [], error: null });

    const initialSettings = {
      ...baseSettings,
      sound: true,
      motionEffects: true
    };

    vi.doMock("../../src/helpers/randomCard.js", () => ({
      generateRandomCard,
      loadGokyoLookup,
      renderJudokaCard,
      preloadRandomCardData,
      createHistoryManager: vi.fn(() => ({ add: vi.fn(), get: vi.fn(() => []) }))
    }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({
      loadSettings: vi.fn().mockResolvedValue(initialSettings)
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({
      applyMotionPreference,
      shouldReduceMotionSync
    }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const drawBtn = document.getElementById("draw-card-btn");
    expect(drawBtn.dataset.soundEnabled).toBe("true");
    const { getPreferences } = window.__TEST_API.randomJudoka;
    expect(getPreferences()).toEqual({ prefersReducedMotion: false, soundEnabled: true });

    shouldReduceMotionSync.mockReturnValue(true);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "settings",
        newValue: JSON.stringify({
          ...initialSettings,
          sound: false,
          motionEffects: false,
          featureFlags: initialSettings.featureFlags
        })
      })
    );

    await Promise.resolve();
    expect(drawBtn.dataset.soundEnabled).toBe("false");
    expect(getPreferences()).toEqual({ prefersReducedMotion: true, soundEnabled: false });

    vi.resetModules();
    vi.doUnmock("../../src/helpers/randomCard.js");
    vi.doUnmock("../../src/helpers/dataUtils.js");
    vi.doUnmock("../../src/helpers/settingsStorage.js");
    vi.doUnmock("../../src/helpers/motionUtils.js");
  });
});
