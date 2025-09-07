import { describe, it, expect, vi, beforeEach } from "vitest";

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
  getRoundsPlayed: () => 0,
  getScores: () => ({ playerScore: 0, opponentScore: 0 }),
  getSeed: () => 1,
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

describe("classic battle onTransition", () => {
  let machine;
  let onBattleEvent;
  let offBattleEvent;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = "";
    const events = await import("../../../src/helpers/classicBattle/battleEvents.js");
    events.__resetBattleEventTarget();
    onBattleEvent = events.onBattleEvent;
    offBattleEvent = events.offBattleEvent;
    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    await orchestrator.initClassicBattleOrchestrator({});
    machine = orchestrator.getBattleStateMachine();
  });

  it("emits readiness events when match starts", async () => {
    const requiredSpy = vi.fn();
    const confirmedSpy = vi.fn();
    onBattleEvent("control.readiness.required", requiredSpy);
    onBattleEvent("control.readiness.confirmed", confirmedSpy);

    await machine.dispatch("matchStart");
    await machine.dispatch("ready");

    expect(requiredSpy).toHaveBeenCalledTimes(1);
    expect(requiredSpy.mock.calls[0][0].detail).toEqual({ for: "match" });
    expect(confirmedSpy).toHaveBeenCalledTimes(1);
    expect(confirmedSpy.mock.calls[0][0].detail).toEqual({ for: "match" });

    offBattleEvent("control.readiness.required", requiredSpy);
    offBattleEvent("control.readiness.confirmed", confirmedSpy);
  });

  it("maps interrupt resolution events", async () => {
    const resolvedSpy = vi.fn();
    onBattleEvent("interrupt.resolved", resolvedSpy);

    await machine.dispatch("restartMatch");

    expect(resolvedSpy).toHaveBeenCalledTimes(1);
    expect(resolvedSpy.mock.calls[0][0].detail).toEqual({
      outcome: "restartRound"
    });

    offBattleEvent("interrupt.resolved", resolvedSpy);
  });
});
