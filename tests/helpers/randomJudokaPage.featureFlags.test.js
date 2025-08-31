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
        viewportSimulation: { enabled: false },
        enableCardInspector: { enabled: false },
        tooltipOverlayDebug: { enabled: false }
      }
    });
    const applyMotionPreference = vi.fn();
    const toggleViewportSimulation = vi.fn();
    const toggleInspectorPanels = vi.fn();
    const toggleTooltipOverlayDebug = vi.fn();
    const setTestMode = vi.fn();

    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags,
      isEnabled: vi.fn().mockReturnValue(false),
      featureFlagsEmitter: new EventTarget()
    }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));
    vi.doMock("../../src/helpers/cardUtils.js", () => ({ toggleInspectorPanels }));
    vi.doMock("../../src/helpers/viewportDebug.js", () => ({ toggleViewportSimulation }));
    vi.doMock("../../src/helpers/tooltipOverlayDebug.js", () => ({ toggleTooltipOverlayDebug }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({
      setTestMode,
      isTestModeEnabled: () => false
    }));
    vi.doMock("../../src/helpers/domReady.js", () => ({ onDomReady: vi.fn() }));

    const { initFeatureFlagState } = await import("../../src/helpers/randomJudokaPage.js");
    const state = await initFeatureFlagState();
    expect(state.prefersReducedMotion).toBe(false);
    expect(applyMotionPreference).toHaveBeenCalledWith(true);

    window.matchMedia = originalMatchMedia;
    vi.resetModules();
    vi.doUnmock("../../src/helpers/featureFlags.js");
    vi.doUnmock("../../src/helpers/motionUtils.js");
    vi.doUnmock("../../src/helpers/cardUtils.js");
    vi.doUnmock("../../src/helpers/viewportDebug.js");
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

    vi.doMock("../../src/helpers/randomCard.js", () => ({ generateRandomCard }));
    vi.doMock("../../src/helpers/dataUtils.js", async () => ({
      ...(await vi.importActual("../../src/helpers/dataUtils.js")),
      fetchJson
    }));
    vi.doMock("../../src/helpers/constants.js", async () => ({
      ...(await vi.importActual("../../src/helpers/constants.js")),
      DATA_DIR: ""
    }));
    vi.doMock("../../src/helpers/settingsStorage.js", () => ({ loadSettings }));
    vi.doMock("../../src/helpers/motionUtils.js", () => ({ applyMotionPreference }));

    const { section, container, placeholderTemplate } = createRandomCardDom();
    document.body.append(section, container, placeholderTemplate);

    const { initRandomJudokaPage } = await import("../../src/helpers/randomJudokaPage.js");
    await initRandomJudokaPage();

    const drawBtn = document.getElementById("draw-card-btn");
    drawBtn.fallbackDelayMs = 0;
    drawBtn.timers = { setTimeout: () => 0, clearTimeout: () => {} };
    drawBtn.click();
    await Promise.resolve();
    container.querySelector(".card-container")?.dispatchEvent(new Event("animationend"));
    await drawBtn.drawPromise;

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
});
