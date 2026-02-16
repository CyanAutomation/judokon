import { beforeEach, describe, expect, it, vi } from "vitest";
import { EVENT_TYPES } from "../../../src/helpers/classicBattle/eventCatalog.js";

const testState = vi.hoisted(() => ({
  onTransition: null,
  engine: null,
  mockDispatch: vi.fn(async () => {}),
  bridgeEngine: null,
  engineListeners: {}
}));

vi.mock("../../../src/helpers/classicBattle/stateManager.js", () => ({
  createStateManager: vi.fn(async (_onEnterMap, context, onTransition) => {
    testState.onTransition = onTransition;
    testState.engine = context.engine;
    const machine = {
      context,
      getState: () => "roundPrompt",
      dispatch: vi.fn(async (eventName) => {
        if (eventName === "simulateRoundStart") {
          await testState.onTransition({
            from: "roundPrompt",
            to: "roundSelect",
            event: "promptReady"
          });
        }
        if (eventName === "simulateStateChange") {
          await testState.onTransition({
            from: "roundSelect",
            to: "roundResolve",
            event: "statSelected"
          });
        }
        return true;
      }),
      getAvailableTransitions: () => []
    };
    testState.mockDispatch = machine.dispatch;
    return machine;
  })
}));

vi.mock("../../../src/helpers/BattleEngine.js", () => {
  const engine = {
    stats: ["speed", "power"],
    on: vi.fn((eventName, handler) => {
      testState.engineListeners[eventName] = handler;
    }),
    getRoundsPlayed: vi.fn(() => 1),
    getScores: vi.fn(() => ({ playerScore: 1, opponentScore: 0 })),
    getTimerState: vi.fn(() => ({ phase: "round" })),
    getSeed: vi.fn(() => "seed")
  };
  testState.bridgeEngine = engine;
  return {
    STATS: ["speed", "power"],
    onEngineCreated: vi.fn((cb) => cb(engine))
  };
});

describe("orchestrator canonical event emissions", () => {
  beforeEach(async () => {
    vi.resetModules();
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.__resetBattleEventTarget();
    vi.clearAllMocks();
  });

  it("emits canonical round-start taxonomy once per transition with legacy compatibility", async () => {
    const canonicalRoundStarted = vi.fn();
    const legacyRoundStarted = vi.fn();
    const dottedRoundStarted = vi.fn();

    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.onBattleEvent(EVENT_TYPES.STATE_ROUND_STARTED, canonicalRoundStarted);
    battleEvents.onBattleEvent("roundStarted", legacyRoundStarted);
    battleEvents.onBattleEvent("round.started", dottedRoundStarted);

    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const machine = await orchestrator.initClassicBattleOrchestrator({
      engine: testState.bridgeEngine
    });

    await machine.dispatch("simulateRoundStart");

    expect(canonicalRoundStarted).toHaveBeenCalledTimes(1);
    expect(legacyRoundStarted).toHaveBeenCalledTimes(1);
    expect(dottedRoundStarted).toHaveBeenCalledTimes(1);
  });



  it("bridges engine roundStarted events to canonical and legacy round-start events", async () => {
    const canonicalRoundStarted = vi.fn();
    const legacyRoundStarted = vi.fn();

    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.onBattleEvent(EVENT_TYPES.STATE_ROUND_STARTED, canonicalRoundStarted);
    battleEvents.onBattleEvent("roundStarted", legacyRoundStarted);

    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    await orchestrator.initClassicBattleOrchestrator({
      engine: testState.bridgeEngine
    });

    const roundStartedHandler = testState.engineListeners.roundStarted;
    expect(roundStartedHandler).toBeTypeOf("function");

    roundStartedHandler({ round: 1 });

    expect(canonicalRoundStarted).toHaveBeenCalledTimes(1);
    expect(legacyRoundStarted).toHaveBeenCalledTimes(1);
    expect(canonicalRoundStarted.mock.calls[0][0].detail.roundIndex).toBe(1);
    expect(canonicalRoundStarted.mock.calls[0][0].detail.round).toBe(1);
  });

  it("emits one state-transition taxonomy path without duplicate naming", async () => {
    const canonicalTransition = vi.fn();
    const legacyTransition = vi.fn();

    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.onBattleEvent(EVENT_TYPES.STATE_TRANSITIONED, canonicalTransition);
    battleEvents.onBattleEvent("control.state.changed", legacyTransition);

    const orchestrator = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const machine = await orchestrator.initClassicBattleOrchestrator({
      engine: testState.bridgeEngine
    });

    await machine.dispatch("simulateStateChange");

    expect(canonicalTransition).toHaveBeenCalledTimes(1);
    expect(legacyTransition).toHaveBeenCalledTimes(1);
    expect(canonicalTransition.mock.calls[0][0].type).toBe(EVENT_TYPES.STATE_TRANSITIONED);
    expect(legacyTransition.mock.calls[0][0].type).toBe("control.state.changed");
  });
});
