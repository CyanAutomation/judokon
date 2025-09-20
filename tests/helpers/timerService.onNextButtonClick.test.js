import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { __setStateSnapshot } from "../../src/helpers/classicBattle/battleDebug.js";
import { mount } from "./domUtils.js";
import { runWithFakeTimers } from "./timerUtils.js";

vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn(() => Promise.resolve())
}));

vi.mock("../../src/helpers/classicBattle/skipHandler.js", () => ({
  setSkipHandler: vi.fn()
}));
vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));
vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  skipRoundCooldownIfEnabled: vi.fn(() => false)
}));

describe("onNextButtonClick", () => {
  let btn;
  let warnSpy;

  let rootCleanup;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { query, cleanup } = mount('<button id="next-button" data-role="next-round"></button>');
    rootCleanup = cleanup;
    btn = query('[data-role="next-round"]');
    vi.clearAllMocks();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    if (typeof rootCleanup === "function") rootCleanup();
  });

  it("advances when button is marked ready", async () => {
    let resolveReady;
    await runWithFakeTimers(async () => {
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      btn.dataset.nextReady = "true";
      __setStateSnapshot({ state: "cooldown" });
      resolveReady = vi.fn();
      await onNextButtonClick(
        new MouseEvent("click"),
        { timer: null, resolveReady },
        { root: document }
      );
    });
    const dispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
    const events = await import("../../src/helpers/classicBattle/battleEvents.js");
    expect(btn.disabled).toBe(true);
    expect(btn.dataset.nextReady).toBeUndefined();
    expect(events.emitBattleEvent).toHaveBeenNthCalledWith(1, "countdownFinished");
    expect(events.emitBattleEvent).toHaveBeenNthCalledWith(2, "round.start");
    expect(events.emitBattleEvent).toHaveBeenCalledBefore(dispatcher.dispatchBattleEvent);
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(resolveReady).toHaveBeenCalledTimes(1);
  });

  it("stops timer and dispatches ready when not marked ready", async () => {
    let stop;
    await runWithFakeTimers(async () => {
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      stop = vi.fn();
      __setStateSnapshot({ state: "roundDecision" });
      await onNextButtonClick(
        new MouseEvent("click"),
        { timer: { stop }, resolveReady: null },
        { root: document }
      );
    });
    const dispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
    const events = await import("../../src/helpers/classicBattle/battleEvents.js");
    expect(stop).toHaveBeenCalledTimes(1);
    expect(events.emitBattleEvent).toHaveBeenNthCalledWith(1, "countdownFinished");
    expect(events.emitBattleEvent).toHaveBeenNthCalledWith(2, "round.start");
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
  });

  it("advances immediately when no timer and in cooldown", async () => {
    let resolveReady2;
    await runWithFakeTimers(async () => {
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      __setStateSnapshot({ state: "cooldown" });
      resolveReady2 = vi.fn();
      await onNextButtonClick(
        new MouseEvent("click"),
        { timer: null, resolveReady: resolveReady2 },
        { root: document }
      );
    });
    const dispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
    const events = await import("../../src/helpers/classicBattle/battleEvents.js");
    expect(events.emitBattleEvent).toHaveBeenNthCalledWith(1, "countdownFinished");
    expect(events.emitBattleEvent).toHaveBeenNthCalledWith(2, "round.start");
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(resolveReady2).toHaveBeenCalledTimes(1);
  });

  it("returns early when feature flag skips cooldown", async () => {
    await runWithFakeTimers(async () => {
      const uiHelpers = await import("../../src/helpers/classicBattle/uiHelpers.js");
      uiHelpers.skipRoundCooldownIfEnabled.mockReturnValue(true);
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      btn.dataset.nextReady = "true";
      await onNextButtonClick(
        new MouseEvent("click"),
        { timer: null, resolveReady: null },
        { root: document }
      );
    });
    const dispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
    const events = await import("../../src/helpers/classicBattle/battleEvents.js");
    expect(events.emitBattleEvent).not.toHaveBeenCalled();
    expect(dispatcher.dispatchBattleEvent).not.toHaveBeenCalled();
    expect(btn.disabled).toBe(false);
  });
});
