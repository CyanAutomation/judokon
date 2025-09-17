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
    expect(resolved).toBe(false);
    expect(btn.dataset.nextReady).toBe("true");
    await vi.advanceTimersByTimeAsync(1);
    await controls.ready;
    expect(resolved).toBe(true);
    expect(btn.dataset.nextReady).toBe("true");
    expect(btn.disabled).toBe(false);
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
    vi.doMock("../../../src/helpers/classicBattle/eventDispatcher.js", () => {
      dispatchSpy = vi.fn();
      return { dispatchBattleEvent: dispatchSpy };
    });
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
});
