import { describe, it, expect, vi } from "vitest";
import { createNextButton, createNextRoundTimer } from "./utils.js";

describe("timerService drift handling", () => {
  it("startTimer shows fallback on drift", async () => {
    vi.resetModules();
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn()
    }));
    vi.doMock("../../../src/helpers/timerUtils.js", () => ({
      getDefaultTimer: () => 30
    }));
    let onDrift;
    const watchSpy = vi.fn((dur, cb) => {
      onDrift = cb;
      return vi.fn();
    });
    const startRound = vi.fn(async (onTick) => {
      onTick(3);
    });
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startRound, watchForDrift: watchSpy };
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    await mod.startTimer(async () => {});
    onDrift(2);
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
  });

  it("scheduleNextRound shows fallback on drift", async () => {
    vi.resetModules();
    const showMessage = vi.fn();
    vi.doMock("../../../src/helpers/setupScoreboard.js", () => ({
      showMessage,
      showTemporaryMessage: () => () => {},
      showAutoSelect: vi.fn()
    }));
    vi.doMock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
      enableNextRoundButton: vi.fn(),
      disableNextRoundButton: vi.fn(),
      updateDebugPanel: vi.fn()
    }));
    let onDrift;
    const watchSpy = vi.fn((dur, cb) => {
      onDrift = cb;
      return vi.fn();
    });
    const startCoolDown = vi.fn((onTick) => {
      onTick(3);
    });
    vi.doMock("../../../src/helpers/battleEngineFacade.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/battleEngineFacade.js");
      return { ...actual, startCoolDown, watchForDrift: watchSpy };
    });
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const timer = vi.useFakeTimers();
    createNextButton();
    createNextRoundTimer();
    mod.scheduleNextRound({ matchEnded: false });
    timer.advanceTimersByTime(2000);
    onDrift(1);
    expect(showMessage).toHaveBeenCalledWith("Waiting…");
    timer.clearAllTimers();
  });
});
