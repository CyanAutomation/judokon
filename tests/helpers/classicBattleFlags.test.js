import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/utils/scheduler.js", () => ({
  start: vi.fn(),
  stop: vi.fn(),
  onFrame: vi.fn(),
  cancel: vi.fn(),
  onSecondTick: vi.fn()
}));

describe("classicBattlePage feature flag updates", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("reacts to viewportSimulation and battleDebugPanel flag changes", async () => {
    // Minimal DOM
    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    const opponent = document.createElement("div");
    opponent.id = "opponent-card";
    const stats = document.createElement("div");
    stats.id = "stat-buttons";
    const btn = document.createElement("button");
    btn.dataset.stat = "power";
    stats.appendChild(btn);
    const container = document.createElement("div");
    container.append(battleArea, stats, opponent);
    document.body.append(container);

    const currentFlags = {
      viewportSimulation: { enabled: false },
      battleDebugPanel: { enabled: false },
      enableCardInspector: { enabled: false },
      enableTestMode: { enabled: false }
    };

    const featureFlagsEmitter = new EventTarget();
    const toggleViewportSimulation = vi.fn();

    vi.doMock("../../src/helpers/viewportDebug.js", () => ({
      toggleViewportSimulation
    }));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      featureFlagsEmitter,
      isEnabled: (flag) => currentFlags[flag]?.enabled ?? false,
      initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: currentFlags })
    }));
    vi.doMock("../../src/helpers/stats.js", () => ({
      loadStatNames: async () => [{ name: "Power" }]
    }));
    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => ({}),
      startRound: vi.fn(),
      resetGame: vi.fn(),
      // Provide legacy test hook for compatibility with imports
      _resetForTest: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForOpponentCard: vi.fn() }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      __esModule: true,
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({
      setTestMode: vi.fn(),
      isTestModeEnabled: () => true
    }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({
      initTooltips: vi.fn().mockResolvedValue(() => {})
    }));

    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    // Enable viewportSimulation and battleDebugPanel
    currentFlags.viewportSimulation.enabled = true;
    currentFlags.battleDebugPanel.enabled = true;
    featureFlagsEmitter.dispatchEvent(new CustomEvent("change"));

    expect(toggleViewportSimulation).toHaveBeenCalledWith(true);
    const panel = document.getElementById("debug-panel");
    expect(panel).toBeTruthy();
    expect(panel.classList.contains("hidden")).toBe(false);
    expect(panel.parentElement).toBe(battleArea.parentElement);
    expect(panel.nextElementSibling).toBe(battleArea);

    // Disable battleDebugPanel
    currentFlags.battleDebugPanel.enabled = false;
    featureFlagsEmitter.dispatchEvent(new CustomEvent("change"));
    expect(document.getElementById("debug-panel")).toBeFalsy();
  });

  it("copies debug output text to the clipboard", async () => {
    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    const container = document.createElement("div");
    container.append(battleArea);
    document.body.append(container);

    const currentFlags = {
      viewportSimulation: { enabled: false },
      battleDebugPanel: { enabled: false },
      enableCardInspector: { enabled: false },
      enableTestMode: { enabled: false }
    };

    const featureFlagsEmitter = new EventTarget();
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      featureFlagsEmitter,
      isEnabled: (flag) => currentFlags[flag]?.enabled ?? false,
      initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: currentFlags })
    }));
    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => ({}),
      startRound: vi.fn(),
      resetGame: vi.fn(),
      _resetForTest: vi.fn()
    }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({
      setTestMode: vi.fn(),
      isTestModeEnabled: () => true
    }));

    const tooltip = await import("../../src/helpers/tooltip.js");
    vi.spyOn(tooltip, "initTooltips").mockResolvedValue(() => {});
    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattlePage.js");
    await setupClassicBattlePage();

    currentFlags.battleDebugPanel.enabled = true;
    featureFlagsEmitter.dispatchEvent(new CustomEvent("change"));

    const panel = document.getElementById("debug-panel");
    const pre = document.getElementById("debug-output");
    pre.textContent = "battle info";
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true
    });

    const copyBtn = document.getElementById("debug-copy");
    copyBtn.dispatchEvent(new Event("click", { bubbles: true }));

    expect(writeText).toHaveBeenCalledWith("battle info");
      expect(copyBtn.closest("#debug-panel")).toBe(panel);
  });
  it("maps number keys to stat buttons only when statHotkeys is enabled", async () => {
    const stats = document.createElement("div");
    stats.id = "stat-buttons";
    const btn = document.createElement("button");
    btn.dataset.stat = "power";
    stats.appendChild(btn);
    document.body.append(stats);

    const currentFlags = { statHotkeys: { enabled: false } };
    const featureFlagsEmitter = new EventTarget();

    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      featureFlagsEmitter,
      isEnabled: (flag) => currentFlags[flag]?.enabled ?? false,
      initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: currentFlags })
    }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({
      setTestMode: vi.fn(),
      isTestModeEnabled: () => false
    }));

    const { initStatButtons } = await import("../../src/helpers/classicBattle/uiHelpers.js");
    initStatButtons({});

    const clickSpy = vi.spyOn(btn, "click");
    btn.disabled = false;

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(clickSpy).not.toHaveBeenCalled();

    currentFlags.statHotkeys.enabled = true;
    featureFlagsEmitter.dispatchEvent(new CustomEvent("change"));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "1" }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
