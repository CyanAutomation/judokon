import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks for UI modules invoked via uiService listeners
const clearMessage = vi.fn();
const showMessage = vi.fn();
const updateDebugPanel = vi.fn();

describe("classic battle orchestrator UI events", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear any persisted state between tests influencing guard logic
    delete window.__classicBattleState;
    delete window.__classicBattlePrevState;
    clearMessage.mockClear();
    showMessage.mockClear();
    updateDebugPanel.mockClear();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      clearMessage,
      showMessage
    }));
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      updateDebugPanel
    }));
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
