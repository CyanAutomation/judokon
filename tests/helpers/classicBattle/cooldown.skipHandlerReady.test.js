import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";
import { createMockScheduler } from "../mockScheduler.js";

describe("skip handler clears fallback timer", () => {
  let scheduler;
  /** @type {ReturnType<typeof vi.spyOn>} */
  let errorSpy;
  /** @type {ReturnType<typeof vi.spyOn>} */
  let warnSpy;
  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = createMockScheduler();
    document.body.innerHTML = "";
    createTimerNodes();
    document.body.dataset.battleState = "cooldown";
    vi.resetModules();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
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
      dispatchBattleEvent: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn(),
      emitBattleEvent: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timers/createRoundTimer.js", () => ({
      createRoundTimer: () => {
        const handlers = {};
        return {
          on: (ev, fn) => {
            handlers[ev] = fn;
          },
          start: vi.fn(),
          stop: () => {
            handlers.expired && handlers.expired();
          }
        };
      }
    }));
    vi.doMock("../../../src/helpers/CooldownRenderer.js", () => ({
      attachCooldownRenderer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
      computeNextRoundCooldown: () => 0
    }));
  });

  afterEach(async () => {
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith("[test] skip: stop nextRoundTimer");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
    vi.restoreAllMocks();
    const { resetSkipState } = await import("../../../src/helpers/classicBattle/skipHandler.js");
    resetSkipState();
  });

  it("fires ready once after skipping", async () => {
    const eventDispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    const { startCooldown } = await import("../../../src/helpers/classicBattle/roundManager.js");
    const { skipCurrentPhase } = await import("../../../src/helpers/classicBattle/skipHandler.js");
    startCooldown({}, scheduler);
    skipCurrentPhase();
    await vi.advanceTimersByTimeAsync(0);
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenCalledTimes(1);
    const FALLBACK_DELAY_MS = 20; // advance past fallback timeout (10ms) to ensure it would fire if uncleared
    await vi.advanceTimersByTimeAsync(FALLBACK_DELAY_MS);
    expect(eventDispatcher.dispatchBattleEvent).toHaveBeenCalledTimes(1);
  });
});
