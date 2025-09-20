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

  it("caches the getter result and continues to dedupe rapid ready events", async () => {
    const dispatchSpies = [];
    const machineGetter = vi.fn(() => {
      const dispatch = vi.fn(async () => "dispatched");
      dispatchSpies.push(dispatch);
      return {
        dispatch,
        getState: vi.fn(() => "cooldown")
      };
    });

    globalThis.__classicBattleDebugRead = (token) => {
      if (token === "getClassicBattleMachine") {
        return machineGetter;
      }
      return undefined;
    };

    await withMutedConsole(async () => {
      const firstResult = await dispatchBattleEvent("ready");
      expect(firstResult).toBe("dispatched");
    }, ["error", "warn", "log"]);

    expect(machineGetter).toHaveBeenCalledTimes(1);
    expect(dispatchSpies).toHaveLength(1);
    expect(dispatchSpies[0]).toHaveBeenCalledTimes(1);

    resetDispatchHistory();
    const stableMachine = {
      dispatch: vi.fn(async () => "dispatched"),
      getState: vi.fn(() => "cooldown")
    };
    machineGetter.mockImplementation(() => stableMachine);

    await withMutedConsole(async () => {
      const firstReady = await dispatchBattleEvent("ready");
      expect(firstReady).toBe("dispatched");

      const secondReady = await dispatchBattleEvent("ready");
      expect(secondReady).toBe(true);
    }, ["error", "warn", "log"]);

    expect(stableMachine.dispatch).toHaveBeenCalledTimes(1);
  });
});
