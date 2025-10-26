import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useCanonicalTimers } from "../../setup/fakeTimers.js";

describe("roundReadyState", () => {
  let timers;
  let originalDebugReader;
  let stdoutSpy;
  let dispatchBattleEvent;
  let resetDispatchHistory;
  let setReadyDispatchedForCurrentCooldown;
  let hasReadyBeenDispatchedForCurrentCooldown;
  let resetReadyDispatchState;
  let roundStore;

  beforeEach(async () => {
    vi.resetModules();
    timers = useCanonicalTimers();
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    originalDebugReader = globalThis.__classicBattleDebugRead;

    ({ dispatchBattleEvent, resetDispatchHistory } = await import(
      "../../../src/helpers/classicBattle/eventDispatcher.js"
    ));
    ({
      setReadyDispatchedForCurrentCooldown,
      hasReadyBeenDispatchedForCurrentCooldown,
      resetReadyDispatchState
    } = await import("../../../src/helpers/classicBattle/roundReadyState.js"));
    ({ roundStore } = await import("../../../src/helpers/classicBattle/roundStore.js"));

    roundStore.reset();
    resetDispatchHistory();
  });

  afterEach(async () => {
    await vi.runAllTimersAsync();
    resetDispatchHistory();
    roundStore.reset();
    timers.cleanup();
    stdoutSpy.mockRestore();
    if (originalDebugReader) {
      globalThis.__classicBattleDebugRead = originalDebugReader;
    } else {
      delete globalThis.__classicBattleDebugRead;
    }
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("dedupes ready dispatches until reset while keeping the ready state in sync", async () => {
    const dispatchSpy = vi.fn(async () => "ready-dispatched");
    const machine = {
      dispatch: dispatchSpy,
      getState: vi.fn(() => "cooldown")
    };

    globalThis.__classicBattleDebugRead = vi.fn((token) => {
      if (token === "getClassicBattleMachine") {
        return () => machine;
      }
      return undefined;
    });

    const resetReadySpy = vi.spyOn(roundStore, "resetReadyDispatch");

    expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

    setReadyDispatchedForCurrentCooldown(true);
    expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);

    setReadyDispatchedForCurrentCooldown(false);
    expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
    expect(resetReadySpy).toHaveBeenCalledTimes(1);

    const firstReady = await dispatchBattleEvent("ready");
    expect(firstReady).toBe("ready-dispatched");
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    const dedupedReady = await dispatchBattleEvent("ready");
    expect(dedupedReady).toBe(true);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    resetReadySpy.mockClear();
    resetReadyDispatchState();
    expect(resetReadySpy).toHaveBeenCalledTimes(1);
    expect(hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

    const afterResetReady = await dispatchBattleEvent("ready");
    expect(afterResetReady).toBe("ready-dispatched");
    expect(dispatchSpy).toHaveBeenCalledTimes(2);
  });
});
