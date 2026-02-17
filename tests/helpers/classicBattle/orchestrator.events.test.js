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

  it("non-control events do not mutate battle mode state", async () => {
    const { __resetBattleEventTarget, emitBattleEvent } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    const { EVENT_TYPES } = await import("../../../src/helpers/classicBattle/eventCatalog.js");
    const { bindRoundFlowController } = await import(
      "../../../src/helpers/classicBattle/roundFlowController.js"
    );

    __resetBattleEventTarget();
    bindRoundFlowController();

    document.body.innerHTML = '<div id="opponent-card" class="opponent-hidden"></div>';
    document.body.dataset.battleState = "roundSelect";
    document.body.setAttribute("data-battle-state", "roundSelect");
    document.body.dataset.uiModeClass = "battle-mode-roundSelect";
    document.body.classList.add("battle-mode-roundSelect");

    emitBattleEvent("round.start", { source: "test" });
    emitBattleEvent("round.evaluated", { winner: "opponent" });
    emitBattleEvent("match.concluded", { scores: { player: 0, opponent: 1 } });
    emitBattleEvent("timer.countdownStarted", { secondsRemaining: 3 });

    expect(document.body.dataset.battleState).toBe("roundSelect");
    expect(document.body.getAttribute("data-battle-state")).toBe("roundSelect");
    expect(document.body.dataset.uiModeClass).toBe("battle-mode-roundSelect");
    expect(document.body.classList.contains("battle-mode-roundSelect")).toBe(true);

    emitBattleEvent(EVENT_TYPES.STATE_TRANSITIONED, { from: "roundSelect", to: "roundDisplay" });

    expect(document.body.dataset.battleState).toBe("roundDisplay");
    expect(document.body.getAttribute("data-battle-state")).toBe("roundDisplay");
    expect(document.body.dataset.uiModeClass).toBe("battle-mode-roundDisplay");
    expect(document.body.classList.contains("battle-mode-roundDisplay")).toBe(true);
  });

  it("applies control transition once when flow and round UI handlers are both bound", async () => {
    const { __resetBattleEventTarget, emitBattleEvent, onBattleEvent } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    const { EVENT_TYPES } = await import("../../../src/helpers/classicBattle/eventCatalog.js");
    const { bindRoundFlowController } = await import(
      "../../../src/helpers/classicBattle/roundFlowController.js"
    );
    const { bindRoundUIEventHandlersDynamic } = await import(
      "../../../src/helpers/classicBattle/roundUI.js"
    );

    __resetBattleEventTarget();
    bindRoundFlowController();
    bindRoundUIEventHandlersDynamic();

    document.body.innerHTML = '<div id="opponent-card" class="opponent-hidden"></div>';

    const disableSpy = vi.fn();
    onBattleEvent("statButtons:disable", disableSpy);

    emitBattleEvent(EVENT_TYPES.STATE_TRANSITIONED, { from: "roundSelect", to: "roundDisplay" });

    expect(disableSpy).toHaveBeenCalledTimes(1);
    expect(document.body.dataset.battleState).toBe("roundDisplay");
    expect(document.body.classList.contains("battle-mode-roundDisplay")).toBe(true);
  });
});
