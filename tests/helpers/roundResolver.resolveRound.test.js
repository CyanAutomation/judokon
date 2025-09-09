import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

import * as roundResolver from "../../src/helpers/classicBattle/roundResolver.js";

describe("resolveRound", () => {
  let dispatchMock;
  let emitMock;

  beforeEach(async () => {
    vi.useFakeTimers();
    dispatchMock = (await import("../../src/helpers/classicBattle/eventDispatcher.js"))
      .dispatchBattleEvent;
    emitMock = (await import("../../src/helpers/classicBattle/battleEvents.js")).emitBattleEvent;
    dispatchMock.mockResolvedValue();
    emitMock.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete document.body.dataset.battleState;
  });

  it("prevents concurrent resolution", async () => {
    const store = {};
    const opts = { delayMs: 10, sleep: (ms) => new Promise((r) => setTimeout(r, ms)) };
    const first = roundResolver.resolveRound(store, "power", 1, 2, opts);
    const second = await roundResolver.resolveRound(store, "power", 1, 2, opts);
    expect(second).toBeUndefined();
    await vi.advanceTimersByTimeAsync(10);
    await first;
    const evalCalls = dispatchMock.mock.calls.filter(([evt]) => evt === "evaluate").length;
    expect(evalCalls).toBe(1);
    const revealCalls = emitMock.mock.calls.filter(([evt]) => evt === "opponentReveal").length;
    expect(revealCalls).toBe(1);
    const third = roundResolver.resolveRound(store, "power", 1, 2, opts);
    await vi.advanceTimersByTimeAsync(10);
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
