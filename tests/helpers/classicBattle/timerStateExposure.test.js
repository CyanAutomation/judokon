import { describe, it, expect, vi, beforeEach } from "vitest";
import { SimpleEmitter } from "../../../src/helpers/events/SimpleEmitter.js";

let debugHooks;
let orchestrator;

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
  updateTimer: vi.fn(),
  updateRoundCounter: vi.fn(),
  clearRoundCounter: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: vi.fn()
}));

// These will be defined per test run
let timerState;
let store;
let engineEmitter;

const createEngineMock = () => {
  engineEmitter = new SimpleEmitter();
  return {
    on: engineEmitter.on.bind(engineEmitter),
    getTimerState: () => ({ ...timerState })
  };
};

vi.mock("../../../src/helpers/classicBattle/stateManager.js", () => ({
  createStateManager: async (_onEnter, { store }, onTransition) => {
    const machine = {
      context: { store, engine: createEngineMock() },
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

describe("classic battle timer state exposure", () => {
  beforeEach(async () => {
    vi.resetModules();
    debugHooks = await import("../../../src/helpers/classicBattle/debugHooks.js");
    orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    document.body.innerHTML = "";
    timerState = {
      remaining: 30,
      paused: false,
      category: "roundTimer",
      pauseOnHidden: true
    };
  });

  it("mirrors timer state on window", async () => {
    await orchestrator.initClassicBattleOrchestrator({});
    const exposed = debugHooks.readDebugState("classicBattleTimerState");
    expect(exposed).toMatchObject({
      remaining: 30,
      paused: false
    });
  });

  it("updates paused/resumed and remaining after timer state changes", async () => {
    await orchestrator.initClassicBattleOrchestrator({});

    timerState.paused = true;
    timerState.remaining = 25;
    await orchestrator._mirrorTimerState?.();
    expect(debugHooks.readDebugState("classicBattleTimerState").paused).toBe(true);
    expect(debugHooks.readDebugState("classicBattleTimerState").remaining).toBe(25);

    timerState.paused = false;
    timerState.remaining = 20;
    await orchestrator._mirrorTimerState?.();
    expect(debugHooks.readDebugState("classicBattleTimerState").paused).toBe(false);
    expect(debugHooks.readDebugState("classicBattleTimerState").remaining).toBe(20);
  });
});
