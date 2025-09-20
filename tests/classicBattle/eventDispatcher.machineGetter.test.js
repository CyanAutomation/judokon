import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { withMutedConsole } from "../utils/console.js";

describe("Classic Battle dispatchBattleEvent getter caching", () => {
  let originalDebugReader;
  let stdoutSpy;
  let dispatchBattleEvent;
  let resetDispatchHistory;

  beforeEach(async () => {
    ({ dispatchBattleEvent, resetDispatchHistory } = await import(
      "../../src/helpers/classicBattle/eventDispatcher.js"
    ));
    vi.useFakeTimers();
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    originalDebugReader = globalThis.__classicBattleDebugRead;
  });

  afterEach(async () => {
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    stdoutSpy.mockRestore();
    resetDispatchHistory();
    if (originalDebugReader) {
      globalThis.__classicBattleDebugRead = originalDebugReader;
    } else {
      delete globalThis.__classicBattleDebugRead;
    }
    vi.resetModules();
  });

  it("invokes the machine getter exactly once for a single dispatch", async () => {
    const machineInstances = [];
    const machineGetter = vi.fn(() => {
      const dispatch = vi.fn(async () => "dispatched");
      const machine = {
        dispatch,
        getState: vi.fn(() => "cooldown")
      };
      machineInstances.push(machine);
      return machine;
    });

    globalThis.__classicBattleDebugRead = (token) => {
      if (token === "getClassicBattleMachine") {
        return machineGetter;
      }
      return undefined;
    };

    await withMutedConsole(async () => {
      const result = await dispatchBattleEvent("ready");
      expect(result).toBe("dispatched");
    }, ["error", "warn", "log"]);

    expect(machineGetter).toHaveBeenCalledTimes(1);
    expect(machineInstances).toHaveLength(1);
    expect(machineInstances[0].dispatch).toHaveBeenCalledTimes(1);
    expect(machineInstances[0].getState).toHaveBeenCalled();
  });

  it("uses a fresh machine instance when the getter implementation changes", async () => {
    const firstMachine = {
      dispatch: vi.fn(async () => "first"),
      getState: vi.fn(() => "cooldown")
    };
    const secondMachine = {
      dispatch: vi.fn(async () => "second"),
      getState: vi.fn(() => "cooldown")
    };

    const machineGetter = vi.fn(() => firstMachine);

    globalThis.__classicBattleDebugRead = (token) => {
      if (token === "getClassicBattleMachine") {
        return machineGetter;
      }
      return undefined;
    };

    await withMutedConsole(async () => {
      const firstReady = await dispatchBattleEvent("ready");
      expect(firstReady).toBe("first");
    }, ["error", "warn", "log"]);

    expect(machineGetter).toHaveBeenCalledTimes(1);
    expect(firstMachine.dispatch).toHaveBeenCalledTimes(1);

    resetDispatchHistory();
    machineGetter.mockImplementation(() => secondMachine);

    await withMutedConsole(async () => {
      const secondReady = await dispatchBattleEvent("ready");
      expect(secondReady).toBe("second");

      const dedupedReady = await dispatchBattleEvent("ready");
      expect(dedupedReady).toBe(true);
    }, ["error", "warn", "log"]);

    expect(machineGetter).toHaveBeenCalledTimes(3);
    expect(firstMachine.dispatch).toHaveBeenCalledTimes(1);
    expect(secondMachine.dispatch).toHaveBeenCalledTimes(1);
  });
});
