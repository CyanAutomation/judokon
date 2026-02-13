// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { createTestBattleDom } from "./classicBattle/createTestBattleDom.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const { getOpponentJudoka, getStatValue } = vi.hoisted(() => ({
  getOpponentJudoka: vi.fn(),
  getStatValue: vi.fn()
}));

// ===== Top-level vi.mock() calls =====
vi.mock("../../src/helpers/classicBattle/cardSelection.js", () => ({
  getOpponentJudoka
}));

vi.mock("../../src/helpers/battle/index.js", () => ({
  getStatValue
}));

let debugHooks;

let store;
let cleanupBattleDom = null;
beforeEach(async () => {
  vi.resetModules();
  cleanupBattleDom = null;
  debugHooks = await import("../../src/helpers/classicBattle/debugHooks.js");
  store = {};
  getOpponentJudoka.mockClear();
  getStatValue.mockClear();
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
    const timers = useCanonicalTimers();
    getOpponentJudoka.mockImplementation(() => ({ stats: { strength: 3 } }));
    getStatValue.mockImplementation((el) => (el?.id === "player-card" ? 5 : 3));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");

    const { cleanup, dispatchBattleState } = await createTestBattleDom();
    cleanupBattleDom = cleanup;
    dispatchBattleState({ from: "roundPrompt", to: "roundSelect" });
    dispatchBattleState({ from: "roundSelect", to: "roundResolve" });
    debugHooks.exposeDebugState("roundDebug", {});

    const store = { playerChoice: "strength" };
    const machine = { dispatch: vi.fn().mockResolvedValue(undefined) };

    await mod.computeAndDispatchOutcome(store, machine);
    await vi.runAllTimersAsync();

    expect(machine.dispatch).toHaveBeenCalledWith("outcome=winPlayer");
    expect(machine.dispatch).toHaveBeenCalledWith("continue");
    timers.cleanup();
  });

  it("waits for user input when autoContinue is disabled", async () => {
    const timers = useCanonicalTimers();
    getOpponentJudoka.mockImplementation(() => ({ stats: { strength: 3 } }));
    getStatValue.mockImplementation((el) => (el?.id === "player-card" ? 5 : 3));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    mod.setAutoContinue(false);

    const { cleanup, dispatchBattleState } = await createTestBattleDom();
    cleanupBattleDom = cleanup;
    dispatchBattleState({ from: "roundPrompt", to: "roundSelect" });
    dispatchBattleState({ from: "roundSelect", to: "roundResolve" });
    debugHooks.exposeDebugState("roundDebug", {});

    const store = { playerChoice: "strength" };
    const machine = { dispatch: vi.fn().mockResolvedValue(undefined) };

    await mod.computeAndDispatchOutcome(store, machine);
    await vi.runAllTimersAsync();

    expect(machine.dispatch).toHaveBeenCalledWith("outcome=winPlayer");
    expect(machine.dispatch).not.toHaveBeenCalledWith("continue");
    timers.cleanup();
  });

  it("does not resolve before async outcome dispatch completes", async () => {
    const timers = useCanonicalTimers();
    getOpponentJudoka.mockImplementation(() => ({ stats: { strength: 3 } }));
    getStatValue.mockImplementation((el) => (el?.id === "player-card" ? 5 : 3));

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");
    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");

    const { cleanup, dispatchBattleState } = await createTestBattleDom();
    cleanupBattleDom = cleanup;
    dispatchBattleState({ from: "roundPrompt", to: "roundSelect" });
    dispatchBattleState({ from: "roundSelect", to: "roundResolve" });
    debugHooks.exposeDebugState("roundDebug", {});

    const store = { playerChoice: "strength" };
    let releaseDispatch;
    const pendingDispatch = new Promise((resolve) => {
      releaseDispatch = resolve;
    });
    const machine = {
      dispatch: vi
        .fn()
        .mockImplementationOnce(() => pendingDispatch)
        .mockResolvedValue(undefined)
    };

    let settled = false;
    const pendingOutcome = mod.computeAndDispatchOutcome(store, machine).then(() => {
      settled = true;
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(emitSpy).not.toHaveBeenCalledWith("debugPanelUpdate");

    releaseDispatch();
    await pendingOutcome;

    expect(machine.dispatch).toHaveBeenCalledWith("outcome=winPlayer");
    expect(machine.dispatch).toHaveBeenCalledWith("continue");
    expect(emitSpy).toHaveBeenCalledWith("debugPanelUpdate");
    timers.cleanup();
  });
  it("dispatches interrupt when no outcome is produced", async () => {
    getOpponentJudoka.mockImplementation(() => ({ stats: { strength: 5 } }));
    getStatValue.mockImplementation(() => NaN);

    const mod = await import("../../src/helpers/classicBattle/orchestratorHandlers.js");

    const { cleanup, dispatchBattleState } = await createTestBattleDom();
    cleanupBattleDom = cleanup;
    dispatchBattleState({ from: "roundPrompt", to: "roundSelect" });
    dispatchBattleState({ from: "roundSelect", to: "roundResolve" });
    debugHooks.exposeDebugState("roundDebug", {});

    const store = { playerChoice: "strength" };
    const machine = { dispatch: vi.fn().mockResolvedValue(undefined) };

    await mod.computeAndDispatchOutcome(store, machine);

    expect(machine.dispatch).toHaveBeenCalledWith("outcome=draw", { reason: "guardNoOutcome" });
  });
});
