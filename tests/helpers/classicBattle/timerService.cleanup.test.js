import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimerNodes } from "./domUtils.js";

describe("timerService cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes drift watcher on skip", async () => {
    const secondCallbacks = new Map();
    vi.doMock("../../../src/utils/scheduler.js", () => ({
      onSecondTick: (cb) => {
        const id = secondCallbacks.size + 1;
        secondCallbacks.set(id, cb);
        return id;
      },
      cancel: (id) => {
        secondCallbacks.delete(id);
      }
    }));
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage: vi.fn(),
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn(),
      clearTimer: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/autoSelectStat.js", () => ({
      autoSelectStat: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/featureFlags.js", () => ({
      isEnabled: () => false
    }));
    vi.doMock("../../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: () => 5
    }));
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => ({
      startRound: () => Promise.resolve(),
      watchForDrift: (_d, _cb, { onSecondTick, cancel }) => {
        const id = onSecondTick(() => {});
        return () => cancel(id);
      },
      stopTimer: vi.fn()
    }));

    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const skip = await import("../../../src/helpers/classicBattle/skipHandler.js");
    createTimerNodes();
    await mod.startTimer(async () => {});
    expect(secondCallbacks.size).toBe(1);
    skip.skipCurrentPhase();
    expect(secondCallbacks.size).toBe(0);
  });
});
