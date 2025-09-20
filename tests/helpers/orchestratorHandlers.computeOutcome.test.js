// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTestBattleDom } from "./classicBattle/createTestBattleDom.js";
let debugHooks;

let store;
let cleanupBattleDom = null;
beforeEach(async () => {
  vi.resetModules();
  cleanupBattleDom = null;
  debugHooks = await import("../../src/helpers/classicBattle/debugHooks.js");
  store = {};
  vi.spyOn(debugHooks, "exposeDebugState").mockImplementation((k, v) => {
    store[k] = v;
  });
  vi.spyOn(debugHooks, "readDebugState").mockImplementation((k) => store[k]);
});

afterEach(() => {
  let cleanupError;
  if (typeof cleanupBattleDom === "function") {
    try {
      cleanupBattleDom();
    } catch (error) {
      cleanupError = error;
    } finally {
      cleanupBattleDom = null;
    }
  } else {
    cleanupBattleDom = null;
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
  if (cleanupError) {
    throw cleanupError;
  }
});

describe("computeAndDispatchOutcome", () => {
  it("dispatches outcome and continue events", async () => {
    vi.useFakeTimers();
    vi.doMock("../../src/helpers/classicBattle/cardSelection.js", () => ({
      getOpponentJudoka: vi.fn(() => ({ stats: { strength: 3 } }))
    }));
    vi.doMock("../../src/helpers/battle/index.js", () => ({
      getStatValue: vi.fn((el) => (el?.id === "player-card" ? 5 : 3))
    }));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");

    const { cleanup, dispatchBattleState } = await createTestBattleDom();
    cleanupBattleDom = cleanup;
    dispatchBattleState({ from: "roundStart", to: "waitingForPlayerAction" });
    dispatchBattleState({ from: "waitingForPlayerAction", to: "roundDecision" });
    debugHooks.exposeDebugState("roundDebug", {});

    const store = { playerChoice: "strength" };
    const machine = { dispatch: vi.fn().mockResolvedValue(undefined) };

    await mod.computeAndDispatchOutcome(store, machine);
    await vi.runAllTimersAsync();

    expect(machine.dispatch).toHaveBeenCalledWith("outcome=winPlayer");
    expect(machine.dispatch).toHaveBeenCalledWith("continue");
  });

  it("waits for user input when autoContinue is disabled", async () => {
    vi.useFakeTimers();
    vi.doMock("../../src/helpers/classicBattle/cardSelection.js", () => ({
      getOpponentJudoka: vi.fn(() => ({ stats: { strength: 3 } }))
    }));
    vi.doMock("../../src/helpers/battle/index.js", () => ({
      getStatValue: vi.fn((el) => (el?.id === "player-card" ? 5 : 3))
    }));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    mod.setAutoContinue(false);

    const { cleanup, dispatchBattleState } = await createTestBattleDom();
    cleanupBattleDom = cleanup;
    dispatchBattleState({ from: "roundStart", to: "waitingForPlayerAction" });
    dispatchBattleState({ from: "waitingForPlayerAction", to: "roundDecision" });
    debugHooks.exposeDebugState("roundDebug", {});

    const store = { playerChoice: "strength" };
    const machine = { dispatch: vi.fn().mockResolvedValue(undefined) };

    await mod.computeAndDispatchOutcome(store, machine);
    await vi.runAllTimersAsync();

    expect(machine.dispatch).toHaveBeenCalledWith("outcome=winPlayer");
    expect(machine.dispatch).not.toHaveBeenCalledWith("continue");
  });

  it("dispatches interrupt when no outcome is produced", async () => {
    vi.doMock("../../src/helpers/classicBattle/cardSelection.js", () => ({
      getOpponentJudoka: vi.fn(() => ({ stats: { strength: 5 } }))
    }));
    vi.doMock("../../src/helpers/battle/index.js", () => ({
      getStatValue: vi.fn(() => NaN)
    }));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");

    const { cleanup, dispatchBattleState } = await createTestBattleDom();
    cleanupBattleDom = cleanup;
    dispatchBattleState({ from: "roundStart", to: "waitingForPlayerAction" });
    dispatchBattleState({ from: "waitingForPlayerAction", to: "roundDecision" });
    debugHooks.exposeDebugState("roundDebug", {});

    const store = { playerChoice: "strength" };
    const machine = { dispatch: vi.fn().mockResolvedValue(undefined) };

    await mod.computeAndDispatchOutcome(store, machine);

    expect(machine.dispatch).toHaveBeenCalledWith("interrupt", { reason: "guardNoOutcome" });
  });
});
