import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Minimal mocks for modules used by orchestrator
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
  showMessage: vi.fn(),
  clearTimer: vi.fn(),
  updateTimer: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  updateDebugPanel: vi.fn()
}));

// These will be defined per test run
let timerState;
const engineMock = {
  getTimerState: () => ({ ...timerState })
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

describe("classic battle timer state exposure", () => {
  let orchestrator;
  let machine;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = "";
    timerState = { remaining: 30, paused: false };
    orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    await orchestrator.initClassicBattleOrchestrator({});
    machine = orchestrator.getBattleStateMachine();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("mirrors timer state on window", async () => {
    await machine.dispatch("stateA");
    expect(window.__classicBattleTimerState).toEqual({ remaining: 30, paused: false });
    const el = document.getElementById("machine-timer");
    expect(el).toBeNull();
  });

  it("updates paused/resumed and remaining after transitions", async () => {
    await machine.dispatch("start");

    timerState.paused = true;
    timerState.remaining = 25;
    await machine.dispatch("paused");
    expect(window.__classicBattleTimerState.paused).toBe(true);
    expect(window.__classicBattleTimerState.remaining).toBe(25);

    timerState.paused = false;
    timerState.remaining = 20;
    await machine.dispatch("resumed");
    expect(window.__classicBattleTimerState.paused).toBe(false);
    expect(window.__classicBattleTimerState.remaining).toBe(20);
  });
});
