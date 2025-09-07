import { describe, it, expect, vi, beforeEach } from "vitest";

// Minimal mocks for modules required by orchestrator
vi.mock("../../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/roundManager.js", () => ({
  resetGame: vi.fn(),
  startRound: vi.fn(),
  _resetForTest: vi.fn()
}));
vi.mock("../../../src/helpers/setupScoreboard.js", () => ({
  clearMessage: vi.fn(),
  showMessage: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn()
}));

const engineMock = {
  getTimerState: () => ({ remaining: 30, paused: false })
};

vi.mock("../../../src/helpers/classicBattle/stateManager.js", () => ({
  createStateManager: async (_onEnter, { store }, onTransition) => {
    const machine = {
      context: { store, engine: engineMock },
      current: "init",
      async dispatch(event) {
        const from = this.current;
        const to = event;
        this.current = to;
        await onTransition({ from, to, event });
      },
      getState() {
        return this.current;
      }
    };
    return machine;
  }
}));

describe("onTransition helpers", () => {
  let orchestrator;
  let machine;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = "";
    const { __resetBattleEventTarget } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    __resetBattleEventTarget();
    orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    await orchestrator.initClassicBattleOrchestrator({});
    machine = orchestrator.getBattleStateMachine();
  });

  it("emits state change and debug events on transition", async () => {
    const { onBattleEvent, offBattleEvent } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    const stateSpy = vi.fn();
    const debugSpy = vi.fn();
    onBattleEvent("battleStateChange", stateSpy);
    onBattleEvent("debugPanelUpdate", debugSpy);
    await machine.dispatch("stateA");
    expect(stateSpy).toHaveBeenCalled();
    expect(debugSpy).toHaveBeenCalled();
    offBattleEvent("battleStateChange", stateSpy);
    offBattleEvent("debugPanelUpdate", debugSpy);
  });
});
