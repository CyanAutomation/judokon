import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";

describe("startCooldown fallback timer", () => {
  let scheduler;
  beforeEach(async () => {
    vi.useFakeTimers();
    scheduler = createMockScheduler();
    document.body.innerHTML = "";
    createTimerNodes();
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: vi.fn(),
      showMessage: () => {},
      showAutoSelect: () => {},
      showTemporaryMessage: () => () => {},
      updateTimer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      dispatchBattleEvent: vi.fn().mockResolvedValue(undefined),
      resetDispatchHistory: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
      setSkipHandler: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
      onBattleEvent: vi.fn(),
      emitBattleEvent: vi.fn()
    }));
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => {
      const makeTimer = (onTick, onExpired, duration) => {
        onTick(duration);
        if (duration <= 0) {
          onExpired();
          return;
        }
        for (let i = 1; i <= duration; i++) {
          scheduler.setTimeout(() => {
            const remaining = duration - i;
            onTick(remaining);
            if (remaining <= 0) onExpired();
          }, i * 1000);
        }
      };
      const mockEngine = {
        startRound: makeTimer,
        startCoolDown: makeTimer,
        stopTimer: vi.fn(),
        STATS: ["a", "b"]
      };
      return {
        requireEngine: () => mockEngine,
        startRound: makeTimer,
        startCoolDown: makeTimer,
        stopTimer: vi.fn(),
        STATS: ["a", "b"]
      };
    });
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: false });
    vi.doMock("../../../src/helpers/CooldownRenderer.js", () => ({
      attachCooldownRenderer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
      computeNextRoundCooldown: () => 0
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolves ready after fallback timer and enables button", async () => {
    const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const btn = document.querySelector('[data-role="next-round"]');
    btn.disabled = true;
    const controls = startCooldown({}, scheduler);
    let resolved = false;
    controls.ready.then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(9);
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    await vi.advanceTimersByTimeAsync(1);
    await controls.ready;
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
  });
});

describe("startCooldown ready dispatch discipline", () => {
  let scheduler;
  /** @type {import('vitest').Mock} */
  let dispatchSpy;

  beforeEach(async () => {
    vi.useFakeTimers();
    scheduler = createMockScheduler();
    document.body.innerHTML = "";
    createTimerNodes();
    vi.resetModules();
    dispatchSpy = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: vi.fn(),
      showMessage: vi.fn(),
      showAutoSelect: vi.fn(),
      showTemporaryMessage: vi.fn(() => () => {}),
      updateTimer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      dispatchBattleEvent: dispatchSpy,
      resetDispatchHistory: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn(),
      emitBattleEvent: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
      computeNextRoundCooldown: () => 1
    }));
    vi.doMock("../../../src/helpers/CooldownRenderer.js", () => ({
      attachCooldownRenderer: vi.fn()
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("dispatches ready exactly once when round timer expires", async () => {
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: true });
    const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    scheduler.tick(20);
    await controls.ready;
    await vi.runAllTimersAsync();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("ready");
  });

  it("dispatches ready exactly once when fallback timer fires", async () => {
    const { mockCreateRoundTimer } = await import("../roundTimerMock.js");
    mockCreateRoundTimer({ scheduled: false, ticks: [], expire: false });
    const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const controls = startCooldown({}, scheduler);
    scheduler.tick(0);
    scheduler.tick(20);
    expect(dispatchSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    scheduler.tick(1000);
    await controls.ready;
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    expect(dispatchSpy).toHaveBeenCalledWith("ready");
    await vi.runAllTimersAsync();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("handleNextRoundExpiration immediate readiness", () => {
  let expiredHandler;
  /** @type {import('vitest').Mock} */
  let dispatchSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    expiredHandler = undefined;
    dispatchSpy = undefined;
    document.body.innerHTML = "";
    createTimerNodes();
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: vi.fn(),
      showMessage: vi.fn(),
      showAutoSelect: vi.fn(),
      showTemporaryMessage: vi.fn(() => () => {}),
      updateTimer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/debugPanel.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/eventDispatcher.js", () => {
      dispatchSpy = vi.fn();
      return {
        dispatchBattleEvent: dispatchSpy,
        resetDispatchHistory: vi.fn()
      };
    });
    vi.doMock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
      setSkipHandler: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn(),
      emitBattleEvent: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
      computeNextRoundCooldown: () => 0
    }));
    vi.doMock("../../../src/helpers/CooldownRenderer.js", () => ({
      attachCooldownRenderer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timers/createRoundTimer.js", () => ({
      createRoundTimer: () => ({
        on: vi.fn((event, handler) => {
          if (event === "expired") expiredHandler = handler;
        }),
        off: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      })
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("dispatches ready when state already progressed past cooldown", async () => {
    const { __setStateSnapshot } = await import(
      "../../../src/helpers/classicBattle/battleDebug.js"
    );
    __setStateSnapshot({ state: "cooldown" });
    const scheduler = {
      setTimeout: vi.fn((fn, ms) => setTimeout(fn, ms)),
      clearTimeout: vi.fn((id) => clearTimeout(id))
    };
    const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const controls = startCooldown({}, scheduler);
    expect(typeof expiredHandler).toBe("function");
    // Simulate orchestrator advancing before fallback fires.
    __setStateSnapshot({ state: "waitingForPlayerAction" });
    await expiredHandler();
    await controls.ready;
    expect(dispatchSpy).toHaveBeenCalledWith("ready");
    await vi.runAllTimersAsync();
  });

  it("falls back to machine dispatch when event dispatcher reports no machine", async () => {
    const { __setStateSnapshot } = await import(
      "../../../src/helpers/classicBattle/battleDebug.js"
    );
    const debugHooks = await import("../../../src/helpers/classicBattle/debugHooks.js");
    const machine = { dispatch: vi.fn() };
    __setStateSnapshot({ state: "cooldown" });
    debugHooks.exposeDebugState("getClassicBattleMachine", () => machine);
    const scheduler = {
      setTimeout: vi.fn((fn, ms) => setTimeout(fn, ms)),
      clearTimeout: vi.fn((id) => clearTimeout(id))
    };
    const originalGlobalRead =
      typeof globalThis !== "undefined" ? globalThis.__classicBattleDebugRead : undefined;
    try {
      if (typeof globalThis !== "undefined") {
        globalThis.__classicBattleDebugRead = (key) => {
          if (key === "getClassicBattleMachine") {
            return () => machine;
          }
          return typeof originalGlobalRead === "function"
            ? originalGlobalRead(key)
            : originalGlobalRead;
        };
      }
      const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
      dispatchSpy.mockImplementation(() => {
        debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
        return false;
      });
      const controls = startCooldown({}, scheduler);
      expect(typeof expiredHandler).toBe("function");
      await expiredHandler();
      await controls.ready;
      expect(machine.dispatch).toHaveBeenCalledWith("ready");
      await vi.runAllTimersAsync();
    } finally {
      if (typeof globalThis !== "undefined") {
        globalThis.__classicBattleDebugRead = originalGlobalRead;
      }
      debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
    }
  });
});

describe("handleNextRoundExpiration orchestrated propagation", () => {
  /** @type {import('vitest').Mock | undefined} */
  let dispatchReadyViaBusSpy;
  /** @type {import('vitest').Mock | undefined} */
  let globalDispatchSpy;
  /** @type {any} */
  let controls;
  let runtime;
  let machine;
  let scoreboardMock;
  let eventBus;

  beforeEach(async () => {
    document.body.innerHTML = '<button id="next-button" data-role="next-round"></button>';
    vi.resetModules();
    dispatchReadyViaBusSpy = vi.fn(async () => true);
    globalDispatchSpy = vi.fn(async () => true);
    machine = { dispatch: vi.fn(() => true), getState: () => "cooldown" };
    scoreboardMock = {
      clearTimer: vi.fn(),
      showMessage: vi.fn(),
      showAutoSelect: vi.fn(),
      showTemporaryMessage: vi.fn(() => () => {}),
      updateTimer: vi.fn()
    };
    const handlers = new Map();
    eventBus = {
      emit: vi.fn((type, detail) => {
        const listeners = handlers.get(type);
        if (!listeners) return;
        for (const listener of listeners) {
          listener(detail);
        }
      }),
      on: vi.fn((type, listener) => {
        if (!handlers.has(type)) {
          handlers.set(type, new Set());
        }
        handlers.get(type)?.add(listener);
      }),
      off: vi.fn((type, listener) => {
        handlers.get(type)?.delete(listener);
      })
    };

    vi.doMock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      dispatchBattleEvent: globalDispatchSpy,
      resetDispatchHistory: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
      setSkipHandler: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn(),
      emitBattleEvent: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/debugHooks.js", () => ({
      readDebugState: vi.fn(() => undefined),
      exposeDebugState: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/preloadService.js", () => ({
      getDebugPanelLazy: vi.fn(async () => ({ updateDebugPanel: vi.fn() }))
    }));
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => scoreboardMock);
    vi.doMock("../../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../../src/helpers/CooldownRenderer.js", () => ({
      attachCooldownRenderer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
      computeNextRoundCooldown: () => 0
    }));
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => ({
      requireEngine: () => ({ startCoolDown: vi.fn() }),
      startCoolDown: vi.fn(),
      startRound: vi.fn(),
      getScores: vi.fn(() => ({})),
      createBattleEngine: vi.fn(),
      stopTimer: vi.fn(),
      STATS: []
    }));
    vi.doMock("../../../src/helpers/classicBattle/nextRound/expirationHandlers.js", async () => {
      const actual = await vi.importActual(
        "../../../src/helpers/classicBattle/nextRound/expirationHandlers.js"
      );
      return {
        ...actual,
        dispatchReadyViaBus: vi.fn(async (options = {}) => {
          const result = await dispatchReadyViaBusSpy?.(options);
          return result ?? true;
        })
      };
    });
    vi.doMock("../../../src/helpers/classicBattle/cooldownOrchestrator.js", async () => {
      const actual = await vi.importActual(
        "../../../src/helpers/classicBattle/cooldownOrchestrator.js"
      );
      return {
        ...actual,
        createExpirationDispatcher: vi.fn((params) => {
          runtime = params.runtime;
          return actual.createExpirationDispatcher(params);
        })
      };
    });

    const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
    controls = startCooldown({}, null, {
      createRoundTimer: () => ({
        on: vi.fn(),
        start: vi.fn(),
        stop: vi.fn()
      }),
      eventBus,
      markReady: vi.fn(),
      isOrchestrated: () => true,
      getClassicBattleMachine: () => machine,
      getStateSnapshot: () => ({ state: "cooldown" }),
      scoreboard: scoreboardMock,
      showSnackbar: vi.fn(),
      setSkipHandler: vi.fn(),
      updateDebugPanel: vi.fn()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches via bus when machine propagation is enabled in orchestrated mode", async () => {
    expect(controls).toBeTruthy();
    expect(typeof runtime?.onExpired).toBe("function");
    dispatchReadyViaBusSpy?.mockClear();
    await runtime.onExpired();
    expect(globalDispatchSpy).toHaveBeenCalledWith("ready");
    expect(dispatchReadyViaBusSpy).toHaveBeenCalledTimes(1);
    expect(machine.dispatch).not.toHaveBeenCalled();
  });
});
