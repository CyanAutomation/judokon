import { describe, expect, test, vi, beforeEach } from "vitest";

const createListenersMap = () => {
  const listeners = new Map();
  const on = vi.fn((event, handler) => {
    const existing = listeners.get(event) || [];
    existing.push(handler);
    listeners.set(event, existing);
  });
  const emit = (event, detail) => {
    const handlers = listeners.get(event) || [];
    handlers.forEach((handler) => handler(detail));
  };
  return { listeners, on, emit };
};

let mockOn;
let mockRequireEngine;
let mockEmitBattleEvent;

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  __esModule: true,
  emitBattleEvent: (...args) => mockEmitBattleEvent?.(...args)
}));

vi.mock("../../src/helpers/battleEngineFacade.js", () => ({
  __esModule: true,
  on: (...args) => mockOn?.(...args),
  requireEngine: () => mockRequireEngine?.(),
  STATS: ["speed", "power"],
  onEngineCreated: vi.fn(() => () => {})
}));

describe("bridgeEngineEvents", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test("attaches one listener set per engine instance", async () => {
    const { listeners, on, emit } = createListenersMap();
    const engine = { id: "engine" };
    mockOn = on;
    mockRequireEngine = vi.fn(() => engine);
    mockEmitBattleEvent = vi.fn();

    const { bridgeEngineEvents } = await import("../../src/helpers/classicBattle/engineBridge.js");

    bridgeEngineEvents();
    bridgeEngineEvents();

    expect(on).toHaveBeenCalledTimes(5);
    expect(listeners.get("roundEnded")).toHaveLength(1);
    expect(listeners.get("roundStarted")).toHaveLength(1);
    expect(listeners.get("timerTick")).toHaveLength(1);
    expect(listeners.get("matchEnded")).toHaveLength(2);

    const roundDetail = { playerScore: 3, opponentScore: 1 };
    mockEmitBattleEvent.mockClear();
    emit("roundEnded", roundDetail);
    expect(mockEmitBattleEvent.mock.calls).toEqual([
      ["roundResolved", roundDetail],
      ["display.score.update", { player: 3, opponent: 1 }]
    ]);

    const roundStartDetail = { round: 2 };
    mockEmitBattleEvent.mockClear();
    emit("roundStarted", roundStartDetail);
    expect(mockEmitBattleEvent.mock.calls).toEqual([
      ["round.started", { roundIndex: 2, availableStats: ["speed", "power"] }]
    ]);

    const roundTickDetail = { phase: "round", remaining: 5 };
    mockEmitBattleEvent.mockClear();
    emit("timerTick", roundTickDetail);
    expect(mockEmitBattleEvent.mock.calls).toEqual([["round.timer.tick", { remainingMs: 5000 }]]);

    const cooldownTickDetail = { phase: "cooldown", remaining: 4 };
    mockEmitBattleEvent.mockClear();
    emit("timerTick", cooldownTickDetail);
    expect(mockEmitBattleEvent.mock.calls).toEqual([
      ["cooldown.timer.tick", { remainingMs: 4000 }]
    ]);

    const matchDetail = { outcome: "matchWinPlayer", playerScore: 4, opponentScore: 2 };
    mockEmitBattleEvent.mockClear();
    emit("matchEnded", matchDetail);
    expect(mockEmitBattleEvent.mock.calls).toEqual([
      ["matchOver", matchDetail],
      [
        "match.concluded",
        { winner: "player", scores: { player: 4, opponent: 2 }, reason: "matchWinPlayer" }
      ]
    ]);
  });
});
