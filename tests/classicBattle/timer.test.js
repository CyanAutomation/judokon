import * as timerUtils from "../../src/helpers/timerUtils.js";

function installMockBattleMachine(dispatchImpl) {
  const machine = {
    dispatch: dispatchImpl,
    getState: () => "cooldown"
  };
  const previousDebugReader = globalThis.__classicBattleDebugRead;
  globalThis.__classicBattleDebugRead = (token) => {
    if (token === "getClassicBattleMachine") {
      return () => machine;
    }
    if (typeof previousDebugReader === "function") {
      return previousDebugReader(token);
    }
    return previousDebugReader;
  };
  return () => {
    if (typeof previousDebugReader === "function") {
      globalThis.__classicBattleDebugRead = previousDebugReader;
    } else if (previousDebugReader !== undefined) {
      globalThis.__classicBattleDebugRead = previousDebugReader;
    } else {
      delete globalThis.__classicBattleDebugRead;
    }
  };
}

describe("Classic Battle round timer", () => {
  test("starts timer and clears on expire deterministically", async () => {
    const timers = vi.useFakeTimers();
    // Provide a short round timer
    const spy = vi.spyOn(timerUtils, "getDefaultTimer").mockImplementation((cat) => {
      if (cat === "roundTimer") return 2;
      return 3;
    });
    try {
      // Minimal DOM: header with timer node
      const { createBattleHeader } = await import("../utils/testUtils.js");
      const header = createBattleHeader();
      document.body.appendChild(header);

      // Bind scoreboard to header
      const sbHelper = await import("../../src/helpers/setupScoreboard.js");
      sbHelper.setupScoreboard({ pauseTimer: () => {}, resumeTimer: () => {} });
      const updateSpy = vi.spyOn(sbHelper, "updateTimer");
      const clearSpy = vi.spyOn(sbHelper, "clearTimer");

      // Deterministic round timer via shared helper
      const { mockCreateRoundTimer } = await import("../helpers/roundTimerMock.js");
      mockCreateRoundTimer({ scheduled: true, tickCount: 2, intervalMs: 1000 });

      const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
      await startTimer(async () => {}, { selectionMade: false });

      const timerEl = document.getElementById("next-round-timer");
      expect(timerEl).toBeTruthy();

      // Immediately shows starting value
      expect(updateSpy).toHaveBeenCalledWith(2);
      expect(timerEl?.textContent).toBe("Time Left: 2s");

      // Advance to expiry and ensure cleared (2s total)
      await timers.advanceTimersByTimeAsync(2000);
      expect(clearSpy).toHaveBeenCalled();
      expect(timerEl?.textContent).toBe("");
    } finally {
      spy.mockRestore();
      timers.useRealTimers();
    }
  });

  test("retries ready dispatch when initial attempt is refused", async () => {
    const timers = vi.useFakeTimers();
    const dispatchBattleEventMock = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const readyState = await import("../../src/helpers/classicBattle/roundReadyState.js");
    readyState.setReadyDispatchedForCurrentCooldown(false);
    const skipModule = await import("../../src/helpers/classicBattle/skipHandler.js");
    const skipSpy = vi.spyOn(skipModule, "setSkipHandler");
    const { advanceWhenReady } = await import("../../src/helpers/classicBattle/timerService.js");
    const restoreMachine = installMockBattleMachine(dispatchBattleEventMock);
    const resolveReady = vi.fn();
    const button = { disabled: false, dataset: { nextReady: "" } };

    try {
      await advanceWhenReady(button, resolveReady);

      expect(dispatchBattleEventMock).toHaveBeenCalledTimes(1);
      expect(resolveReady).toHaveBeenCalledTimes(1);
      expect(skipSpy).not.toHaveBeenCalled();
      expect(button.disabled).toBe(false);
      expect(button.dataset.nextReady).toBe("");
      expect(readyState.hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);

      skipSpy.mockClear();
      resolveReady.mockClear();
      button.disabled = false;

      await vi.runAllTimersAsync();

      await advanceWhenReady(button, resolveReady);

      expect(dispatchBattleEventMock).toHaveBeenCalledTimes(2);
      expect(resolveReady).toHaveBeenCalledTimes(1);
      expect(skipSpy).toHaveBeenCalledTimes(1);
      expect(button.disabled).toBe(true);
      expect(button.dataset.nextReady).toBeUndefined();
    } finally {
      skipSpy.mockRestore();
      restoreMachine();
      readyState.setReadyDispatchedForCurrentCooldown(false);
      timers.useRealTimers();
    }
  });

  test("keeps next button interactive across consecutive ready dispatch refusals", async () => {
    const timers = vi.useFakeTimers();
    const dispatchBattleEventMock = vi.fn().mockResolvedValue(false);
    const readyState = await import("../../src/helpers/classicBattle/roundReadyState.js");
    readyState.setReadyDispatchedForCurrentCooldown(false);
    const skipModule = await import("../../src/helpers/classicBattle/skipHandler.js");
    const skipSpy = vi.spyOn(skipModule, "setSkipHandler");
    const { advanceWhenReady } = await import("../../src/helpers/classicBattle/timerService.js");
    const restoreMachine = installMockBattleMachine(dispatchBattleEventMock);
    const resolveReady = vi.fn();
    const button = { disabled: false, dataset: { nextReady: "" } };

    try {
      await advanceWhenReady(button, resolveReady);

      expect(dispatchBattleEventMock).toHaveBeenCalledTimes(1);
      expect(resolveReady).toHaveBeenCalledTimes(1);
      expect(skipSpy).not.toHaveBeenCalled();
      expect(button.disabled).toBe(false);
      expect(button.dataset.nextReady).toBe("");

      await vi.runAllTimersAsync();

      button.disabled = false;
      resolveReady.mockClear();

      await advanceWhenReady(button, resolveReady);

      expect(dispatchBattleEventMock).toHaveBeenCalledTimes(2);
      expect(resolveReady).toHaveBeenCalledTimes(1);
      expect(skipSpy).not.toHaveBeenCalled();
      expect(button.disabled).toBe(false);
      expect(button.dataset.nextReady).toBe("");
      expect(readyState.hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
    } finally {
      skipSpy.mockRestore();
      restoreMachine();
      readyState.setReadyDispatchedForCurrentCooldown(false);
      timers.useRealTimers();
    }
  });
});
