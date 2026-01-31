import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

// Mock all dependencies before any imports
vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

describe("resolveRound", () => {
  let dispatchMock;
  let emitMock;
  let timers;
  let roundResolver;

  const createDeferred = () => {
    let resolve;
    const promise = new Promise((res) => {
      resolve = res;
    });
    return {
      promise,
      resolve: () => resolve()
    };
  };

  beforeEach(async () => {
    // Clear module cache to ensure fresh imports with mocks applied
    vi.resetModules();

    vi.mock("../../src/helpers/BattleEngine.js", () => ({
      handleStatSelection: vi.fn(() => ({
        outcome: "draw",
        playerScore: 0,
        opponentScore: 0,
        matchEnded: false
      }))
    }));

    // Re-declare mocks after reset
    vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      dispatchBattleEvent: vi.fn()
    }));

    vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      emitBattleEvent: vi.fn()
    }));

    timers = useCanonicalTimers();

    // Import modules after setting up mocks
    const eventDispatcherModule = await import(
      "../../src/helpers/classicBattle/eventDispatcher.js"
    );
    dispatchMock = eventDispatcherModule.dispatchBattleEvent;

    const battleEventsModule = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitMock = battleEventsModule.emitBattleEvent;

    // Import the module under test AFTER configuring all mocks
    const resolverModule = await import("../../src/helpers/classicBattle/roundResolver.js");
    roundResolver = resolverModule;

    dispatchMock.mockResolvedValue();
    emitMock.mockImplementation(() => {});
  });

  afterEach(() => {
    timers.cleanup();
    vi.restoreAllMocks();
    delete document.body.dataset.battleState;
  });

  it("prevents concurrent resolution", async () => {
    const store = {};
    const opts = { delayMs: 0, sleep: async () => {} };
    const originalDelay = roundResolver.delayAndRevealOpponent;
    const delayGate = createDeferred();
    let callCount = 0;
    vi.spyOn(roundResolver, "delayAndRevealOpponent").mockImplementation(async (...args) => {
      callCount += 1;
      if (callCount === 1) {
        await delayGate.promise;
      }
      return originalDelay(...args);
    });

    const first = roundResolver.resolveRound(store, "power", 1, 2, opts);
    const second = await roundResolver.resolveRound(store, "power", 1, 2, opts);
    expect(second).toBeUndefined();
    delayGate.resolve();
    await first;
    const evalCalls = dispatchMock.mock.calls.filter(([evt]) => evt === "evaluate").length;
    expect(evalCalls).toBe(1);
    const revealCalls = emitMock.mock.calls.filter(([evt]) => evt === "opponentReveal").length;
    expect(revealCalls).toBe(1);
    const third = roundResolver.resolveRound(store, "power", 1, 2, opts);
    await third;
    const totalEvalCalls = dispatchMock.mock.calls.filter(([evt]) => evt === "evaluate").length;
    expect(totalEvalCalls).toBe(2);
  });

  it("dispatches evaluate before revealing opponent", async () => {
    const store = {};
    const callOrder = [];
    dispatchMock.mockImplementation(async (evt) => {
      callOrder.push(`dispatch:${evt}`);
    });
    emitMock.mockImplementation((evt) => {
      callOrder.push(`emit:${evt}`);
    });
    await roundResolver.resolveRound(store, "power", 1, 2, {
      delayMs: 0,
      sleep: () => Promise.resolve()
    });
    expect(callOrder[0]).toBe("dispatch:evaluate");
    expect(callOrder[1]).toBe("emit:opponentReveal");
    expect(callOrder[2]).toMatch(/^dispatch:outcome=/);
  });
});
