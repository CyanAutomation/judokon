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
vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  updateDebugPanel: vi.fn()
}));

const engineMock = {
  getTimerState: () => ({ remaining: 30, paused: false })
};

vi.mock("../../../src/helpers/classicBattle/stateMachine.js", () => ({
  BattleStateMachine: {
    async create(_onEnter, { store }, onTransition) {
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
  }
}));

describe("onTransition helpers", () => {
  let orchestrator;
  let machine;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = "";
    orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    await orchestrator.initClassicBattleOrchestrator({});
    machine = orchestrator.getBattleStateMachine();
  });

  it("updates debug globals and timer info on transition", async () => {
    await machine.dispatch("stateA");
    expect(window.__classicBattleState).toBe("stateA");
    const el = document.getElementById("machine-state");
    expect(el).toBeNull();
    expect(window.__classicBattleTimerState).toEqual({ remaining: 30, paused: false });
  });

  it("mirrors state to dataset and dispatches legacy event", async () => {
    const handler = vi.fn();
    document.addEventListener("battle:state", handler);
    await machine.dispatch("stateA");
    expect(document.body.dataset.battleState).toBe("stateA");
    expect(document.body.dataset.prevBattleState).toBe("init");
    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0][0];
    expect(evt.detail).toEqual({ from: "init", to: "stateA", event: "stateA" });
    document.removeEventListener("battle:state", handler);
  });
});
