import { afterEach, describe, expect, test, vi } from "vitest";

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

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  vi.unstubAllGlobals();
});

async function setupBridge({ engines = [{ id: "engine" }], stats = ["speed", "power"], weakSet = true } = {}) {
  vi.resetModules();

  if (!weakSet) {
    vi.stubGlobal("WeakSet", undefined);
  }

  const { listeners, on, emit } = createListenersMap();

  let engineCall = 0;
  const requireEngine = vi.fn(() => {
    const index = Math.min(engineCall, engines.length - 1);
    engineCall += 1;
    return engines[index];
  });

  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    __esModule: true,
    emitBattleEvent: vi.fn()
  }));

  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
    __esModule: true,
    on,
    requireEngine,
    STATS: stats
  }));

  const { bridgeEngineEvents } = await import("../../src/helpers/classicBattle/engineBridge.js");
  const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");

  return { bridgeEngineEvents, emitBattleEvent, listeners, on, emit, requireEngine };
}

describe("bridgeEngineEvents", () => {
  test("attaches one listener set per engine instance", async () => {
    const { bridgeEngineEvents, emitBattleEvent, listeners, on, emit } = await setupBridge();

    bridgeEngineEvents();
    bridgeEngineEvents();

    expect(on).toHaveBeenCalledTimes(4);
    expect(listeners.get("roundEnded")).toHaveLength(1);
    expect(listeners.get("roundStarted")).toHaveLength(1);
    expect(listeners.get("timerTick")).toHaveLength(1);
    expect(listeners.get("matchEnded")).toHaveLength(1);

    const roundDetail = { playerScore: 3, opponentScore: 1 };
    emitBattleEvent.mockClear();
    emit("roundEnded", roundDetail);
    expect(emitBattleEvent.mock.calls).toEqual([
      ["roundResolved", roundDetail],
      ["display.score.update", { player: 3, opponent: 1 }]
    ]);

    const roundStartDetail = { round: 2 };
    emitBattleEvent.mockClear();
    emit("roundStarted", roundStartDetail);
    expect(emitBattleEvent.mock.calls).toEqual([
      ["round.started", { roundIndex: 2, availableStats: ["speed", "power"] }]
    ]);

    const roundTickDetail = { phase: "round", remaining: 5 };
    emitBattleEvent.mockClear();
    emit("timerTick", roundTickDetail);
    expect(emitBattleEvent.mock.calls).toEqual([
      ["round.timer.tick", { remainingMs: 5000 }]
    ]);

    const cooldownTickDetail = { phase: "cooldown", remaining: 4 };
    emitBattleEvent.mockClear();
    emit("timerTick", cooldownTickDetail);
    expect(emitBattleEvent.mock.calls).toEqual([
      ["cooldown.timer.tick", { remainingMs: 4000 }]
    ]);

    const matchDetail = { outcome: "matchWinPlayer", playerScore: 4, opponentScore: 2 };
    emitBattleEvent.mockClear();
    emit("matchEnded", matchDetail);
    expect(emitBattleEvent.mock.calls).toEqual([
      ["matchOver", matchDetail],
      [
        "match.concluded",
        { winner: "player", scores: { player: 4, opponent: 2 }, reason: "matchWinPlayer" }
      ]
    ]);
  });

  test("registers listeners again when the engine instance changes", async () => {
    const engineA = { id: "engine-a" };
    const engineB = { id: "engine-b" };
    const { bridgeEngineEvents, listeners, on } = await setupBridge({ engines: [engineA, engineB] });

    bridgeEngineEvents();
    bridgeEngineEvents();
    bridgeEngineEvents();

    expect(on).toHaveBeenCalledTimes(8);
    expect(listeners.get("roundEnded")).toHaveLength(2);
    expect(listeners.get("matchEnded")).toHaveLength(2);
    expect(listeners.get("roundStarted")).toHaveLength(2);
    expect(listeners.get("timerTick")).toHaveLength(2);
  });

  test("avoids duplicate registration when WeakSet is unavailable", async () => {
    const engine = { id: "engine" };
    const { bridgeEngineEvents, listeners, on, requireEngine } = await setupBridge({
      engines: [engine],
      weakSet: false
    });

    bridgeEngineEvents();
    bridgeEngineEvents();

    expect(on).toHaveBeenCalledTimes(4);
    expect(listeners.get("roundEnded")).toHaveLength(1);
    expect(listeners.get("matchEnded")).toHaveLength(1);

    const symbolMarkers = Object.getOwnPropertySymbols(engine).filter(
      (symbol) => engine[symbol] === true
    );
    const stringMarkers = Object.keys(engine).filter((key) => engine[key] === true);

    expect(symbolMarkers.length + stringMarkers.length).toBeGreaterThan(0);
    expect(requireEngine).toHaveBeenCalledTimes(2);
  });
});
