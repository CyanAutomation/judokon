import { describe, it, expect, vi, beforeEach } from "vitest";

describe("classicBattlePage feature flag updates", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("reacts to viewportSimulation and battleDebugPanel flag changes", async () => {
    // Minimal DOM
    const battleArea = document.createElement("div");
    battleArea.id = "battle-area";
    const computer = document.createElement("div");
    computer.id = "computer-card";
    const stats = document.createElement("div");
    stats.id = "stat-buttons";
    const btn = document.createElement("button");
    btn.dataset.stat = "power";
    stats.appendChild(btn);
    document.body.append(battleArea, stats, computer);

    const currentFlags = {
      viewportSimulation: { enabled: false },
      battleDebugPanel: { enabled: false },
      enableCardInspector: { enabled: false },
      enableTestMode: { enabled: false },
      randomStatMode: { enabled: true }
    };

    const featureFlagsEmitter = new EventTarget();
    const toggleViewportSimulation = vi.fn();

    vi.doMock("../../src/helpers/viewportDebug.js", () => ({
      toggleViewportSimulation
    }));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      featureFlagsEmitter,
      isEnabled: (flag) => currentFlags[flag]?.enabled ?? false
    }));
    vi.doMock("../../src/helpers/stats.js", () => ({
      loadStatNames: async () => [{ name: "Power" }]
    }));
    vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => ({}),
      startRound: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleJudokaPage.js", () => ({ waitForComputerCard: vi.fn() }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar: vi.fn() }));
    vi.doMock("../../src/helpers/tooltip.js", () => ({ initTooltips: vi.fn() }));
    vi.doMock("../../src/helpers/testModeUtils.js", () => ({ setTestMode: vi.fn() }));

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
    expect(panel.parentElement).toBe(computer);

    // Disable battleDebugPanel
    currentFlags.battleDebugPanel.enabled = false;
    featureFlagsEmitter.dispatchEvent(new CustomEvent("change"));
    expect(document.getElementById("debug-panel")).toBeFalsy();
  });
});

