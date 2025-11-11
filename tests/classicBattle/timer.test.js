import { useCanonicalTimers } from "../setup/fakeTimers.js";

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
    const timers = useCanonicalTimers();

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

      // Pass mock duration via dependencies to avoid getDefaultTimer lookup
      await startTimer(
        async () => {},
        { selectionMade: false },
        {
          resolveDuration: async () => ({ duration: 2, synced: true, restore: () => {} })
        }
      );

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
      timers.cleanup();
    }
  });

  test("cleans up visibility listeners between sequential timers", async () => {
    vi.resetModules();
    const timers = useCanonicalTimers();
    const listenerRefs = new Set();
    const originalAdd = document.addEventListener;
    const originalRemove = document.removeEventListener;
    const addSpy = vi
      .spyOn(document, "addEventListener")
      .mockImplementation((type, handler, options) => {
        if (type === "visibilitychange" && typeof handler === "function") {
          listenerRefs.add(handler);
        }
        return originalAdd.call(document, type, handler, options);
      });
    const removeSpy = vi
      .spyOn(document, "removeEventListener")
      .mockImplementation((type, handler, options) => {
        if (type === "visibilitychange" && typeof handler === "function") {
          listenerRefs.delete(handler);
        }
        return originalRemove.call(document, type, handler, options);
      });

    let unmock = null;

    try {
      const { createBattleHeader } = await import("../utils/testUtils.js");
      const header = createBattleHeader();
      document.body.appendChild(header);

      const scoreboardModule = await import("../../src/helpers/setupScoreboard.js");
      scoreboardModule.setupScoreboard({ pauseTimer: () => {}, resumeTimer: () => {} });

      const { mockCreateRoundTimer } = await import("../helpers/roundTimerMock.js");
      unmock = mockCreateRoundTimer({
        scheduled: true,
        tickCount: 1,
        intervalMs: 1000,
        stopEmitsExpired: false
      });

      const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");

      for (const step of ["expire", "stop", "expire"]) {
        const baseline = listenerRefs.size;
        const timer = await startTimer(
          async () => {},
          { selectionMade: false },
          {
            resolveDuration: async () => ({ duration: 1, synced: true, restore: () => {} })
          }
        );
        expect(listenerRefs.size - baseline).toBe(1);

        if (step === "stop") {
          timer.stop();
        } else {
          await timers.advanceTimersByTimeAsync(1000);
        }

        expect(listenerRefs.size).toBe(baseline);
      }
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
      if (unmock?.unmock) {
        unmock.unmock();
      }
      timers.cleanup();
      document.body.innerHTML = "";
    }
  });

  test("cleanup tolerates reentrant expiry and repeated stop calls", async () => {
    vi.resetModules();
    const timers = useCanonicalTimers();
    let cleanupExecutionCount = 0;

    const originalAdd = document.addEventListener;
    const originalRemove = document.removeEventListener;
    const addSpy = vi
      .spyOn(document, "addEventListener")
      .mockImplementation((type, handler, options) => {
        return originalAdd.call(document, type, handler, options);
      });
    const removeSpy = vi
      .spyOn(document, "removeEventListener")
      .mockImplementation((type, handler, options) => {
        return originalRemove.call(document, type, handler, options);
      });

    const expiredHandlers = new Set();

    vi.doMock("../../src/helpers/timers/createRoundTimer.js", () => ({
      createRoundTimer: () => {
        const timer = {
          on: vi.fn((event, handler) => {
            if (event === "expired" && typeof handler === "function") {
              expiredHandlers.add(handler);
              return () => {
                cleanupExecutionCount += 1;
                if (expiredHandlers.has(handler)) {
                  handler();
                  expiredHandlers.delete(handler);
                }
              };
            }
            return () => {};
          }),
          start: vi.fn(),
          stop: vi.fn(() => {
            for (const handler of [...expiredHandlers]) {
              handler();
            }
            return "stopped";
          }),
          pause: vi.fn(),
          resume: vi.fn()
        };
        return timer;
      }
    }));

    try {
      const { createBattleHeader } = await import("../utils/testUtils.js");
      const header = createBattleHeader();
      document.body.appendChild(header);

      const scoreboardModule = await import("../../src/helpers/setupScoreboard.js");
      scoreboardModule.setupScoreboard({ pauseTimer: () => {}, resumeTimer: () => {} });

      const { withMutedConsole } = await import("../utils/console.js");
      const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
      const timer = await startTimer(
        async () => {},
        { selectionMade: false },
        {
          resolveDuration: async () => ({ duration: 1, synced: true, restore: () => {} })
        }
      );

      const [expiredHandler] = expiredHandlers;
      expect(typeof expiredHandler).toBe("function");

      await withMutedConsole(async () => {
        expect(() => expiredHandler()).not.toThrow();
        expect(() => expiredHandler()).not.toThrow();

        expect(timer.stop()).toBe("stopped");
        expect(timer.stop()).toBe("stopped");
      }, ["warn"]);

      expect(removeSpy).toHaveBeenCalledTimes(1);
      expect(cleanupExecutionCount).toBe(1);
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
      vi.doUnmock("../../src/helpers/timers/createRoundTimer.js");
      timers.cleanup();
      document.body.innerHTML = "";
    }
  });

  test("Next button dispatches countdown events and ready when skip flag is active", async () => {
    vi.resetModules();
    const timers = useCanonicalTimers();
    const previousOverrides = typeof window !== "undefined" ? window.__FF_OVERRIDES : undefined;
    if (typeof window !== "undefined") {
      window.__FF_OVERRIDES = { ...(previousOverrides || {}), skipRoundCooldown: true };
    }
    const skipCallbackSpy = vi.fn();
    let readySpy;
    let emitSpy;
    let skipFlagSpy;
    try {
      const { createBattleHeader } = await import("../utils/testUtils.js");
      const header = createBattleHeader();
      const nextButton = document.createElement("button");
      nextButton.id = "next-button";
      document.body.append(header, nextButton);

      const dispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
      readySpy = vi.spyOn(dispatcher, "dispatchBattleEvent").mockResolvedValue();

      const events = await import("../../src/helpers/classicBattle/battleEvents.js");
      emitSpy = vi.spyOn(events, "emitBattleEvent").mockImplementation(() => {});

      const uiHelpers = await import("../../src/helpers/classicBattle/uiHelpers.js");
      const actualSkip = uiHelpers.skipRoundCooldownIfEnabled;
      skipFlagSpy = vi
        .spyOn(uiHelpers, "skipRoundCooldownIfEnabled")
        .mockImplementation((options = {}) => {
          const opts = { ...options };
          if (typeof opts.onSkip === "function") {
            const original = opts.onSkip;
            opts.onSkip = () => {
              original();
              skipCallbackSpy();
            };
          }
          return actualSkip(opts);
        });

      const { __setStateSnapshot } = await import("../../src/helpers/classicBattle/battleDebug.js");
      __setStateSnapshot({ state: "cooldown" });

      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      const resolveReady = vi.fn();
      nextButton.dataset.nextReady = "true";

      await onNextButtonClick(
        new MouseEvent("click"),
        { timer: null, resolveReady },
        { root: document }
      );

      expect(skipFlagSpy).toHaveBeenCalledWith(
        expect.objectContaining({ onSkip: expect.any(Function) })
      );
      expect(skipCallbackSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledTimes(2);
      expect(emitSpy).toHaveBeenNthCalledWith(1, "countdownFinished");
      expect(emitSpy).toHaveBeenNthCalledWith(2, "round.start", {
        source: "next-button",
        via: "skip-hint"
      });
      expect(readySpy).toHaveBeenCalledWith("ready");
      expect(resolveReady).toHaveBeenCalledTimes(1);
      expect(nextButton.disabled).toBe(true);
    } finally {
      if (skipFlagSpy) skipFlagSpy.mockRestore();
      if (emitSpy) emitSpy.mockRestore();
      if (readySpy) readySpy.mockRestore();
      if (typeof window !== "undefined") {
        if (previousOverrides) {
          window.__FF_OVERRIDES = previousOverrides;
        } else {
          delete window.__FF_OVERRIDES;
        }
      }
      document.body.innerHTML = "";
      timers.cleanup();
    }
  });

  test("retries ready dispatch when initial attempt is refused", async () => {
    const timers = useCanonicalTimers();
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
      timers.cleanup();
    }
  });

  test("keeps next button interactive across consecutive ready dispatch refusals", async () => {
    const timers = useCanonicalTimers();
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
      timers.cleanup();
    }
  });
});
