import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks for UI modules invoked via uiService listeners
const clearMessage = vi.fn();
const showMessage = vi.fn();
const updateDebugPanel = vi.fn();

// ===== Top-level vi.mock() calls for orchestrator UI events =====
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  clearMessage,
  showMessage,
  clearTimer: vi.fn(),
  updateTimer: vi.fn(),
  updateRoundCounter: vi.fn(),
  clearRoundCounter: vi.fn()
}));

vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel
}));

describe("classic battle orchestrator UI events", () => {
  beforeEach(() => {
    clearMessage.mockClear();
    showMessage.mockClear();
    updateDebugPanel.mockClear();
    vi.resetModules();
  });

  it("emits events and triggers UI listeners on init", async () => {
    const { onBattleEvent } = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const clearSpy = vi.fn();
    const debugSpy = vi.fn();
    onBattleEvent("scoreboardClearMessage", clearSpy);
    onBattleEvent("debugPanelUpdate", debugSpy);

    await import("../../../src/helpers/classicBattle/uiService.js");
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    await orchestrator.initClassicBattleOrchestrator({});

    expect(clearSpy).toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalled();
    expect(clearMessage).toHaveBeenCalled();
    expect(updateDebugPanel).toHaveBeenCalled();
  });
});
