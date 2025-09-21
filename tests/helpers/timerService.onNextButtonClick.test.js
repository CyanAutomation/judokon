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

function createDeferred() {
  /** @type {() => void} */
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve: resolve ?? (() => {}) };
}

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

  it("dispatches countdown events and ready when skip flag is active", async () => {
    let resolveReady;
    let uiHelpers;
    await runWithFakeTimers(async () => {
      uiHelpers = await import("../../src/helpers/classicBattle/uiHelpers.js");
      uiHelpers.skipRoundCooldownIfEnabled.mockImplementation((options) => {
        if (options?.onSkip) options.onSkip();
        return true;
      });
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
    expect(uiHelpers.skipRoundCooldownIfEnabled).toHaveBeenCalledWith(
      expect.objectContaining({ onSkip: expect.any(Function) })
    );
    expect(events.emitBattleEvent).toHaveBeenCalledTimes(2);
    expect(events.emitBattleEvent).toHaveBeenNthCalledWith(1, "countdownFinished");
    expect(events.emitBattleEvent).toHaveBeenNthCalledWith(2, "round.start");
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(resolveReady).toHaveBeenCalledTimes(1);
    expect(btn.disabled).toBe(true);
    expect(btn.dataset.nextReady).toBeUndefined();
  });

  it("suppresses concurrent clicks while an advance is in flight", async () => {
    await runWithFakeTimers(async () => {
      const dispatcher = await import("../../src/helpers/classicBattle/eventDispatcher.js");
      const events = await import("../../src/helpers/classicBattle/battleEvents.js");
      const mod = await import("../../src/helpers/classicBattle/timerService.js");
      const deferred = createDeferred();
      dispatcher.dispatchBattleEvent
        .mockImplementationOnce(() => deferred.promise)
        .mockImplementation(() => Promise.resolve(true));

      btn.dataset.nextReady = "true";
      __setStateSnapshot({ state: "cooldown" });

      const firstCall = mod.onNextButtonClick(new MouseEvent("click"), {
        timer: null,
        resolveReady: null
      });
      let firstSettled = false;
      firstCall.then(() => {
        firstSettled = true;
      });

      // Allow the first invocation to reach the mocked dispatcher before issuing another click.
      await Promise.resolve();

      const secondCall = mod.onNextButtonClick(new MouseEvent("click"), {
        timer: null,
        resolveReady: null
      });

      // Ensure the guard short-circuits the second attempt while the first is pending.
      await expect(secondCall).resolves.toBeUndefined();
      expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledTimes(1);
      expect(events.emitBattleEvent).toHaveBeenCalledTimes(2);
      expect(firstSettled).toBe(false);

      deferred.resolve();
      await firstCall;
      expect(firstSettled).toBe(true);
    });
  });
});
