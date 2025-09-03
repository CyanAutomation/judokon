import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { __setStateSnapshot } from "../../src/helpers/classicBattle/battleDebug.js";

vi.mock("../../src/helpers/classicBattle/orchestrator.js", () => ({
  dispatchBattleEvent: vi.fn(() => Promise.resolve())
}));

vi.mock("../../src/helpers/classicBattle/skipHandler.js", () => ({
  setSkipHandler: vi.fn()
}));

describe("onNextButtonClick", () => {
  let btn;
  let warnSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    document.body.innerHTML = '<button id="next-button" data-testid="next-button"></button>';
    btn = document.querySelector('[data-testid="next-button"]');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    warnSpy.mockRestore();
    vi.useRealTimers();
  });

  it("advances when button is marked ready", async () => {
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    btn.dataset.nextReady = "true";
    __setStateSnapshot({ state: "cooldown" });
    const resolveReady = vi.fn();
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady });
    const dispatcher = await import("../../src/helpers/classicBattle/orchestrator.js");
    expect(btn.disabled).toBe(true);
    expect(btn.dataset.nextReady).toBeUndefined();
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(resolveReady).toHaveBeenCalledTimes(1);
  });

  it("stops timer and dispatches ready when not marked ready", async () => {
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    const stop = vi.fn();
    __setStateSnapshot({ state: "roundDecision" });
    await onNextButtonClick(new MouseEvent("click"), { timer: { stop }, resolveReady: null });
    const dispatcher = await import("../../src/helpers/classicBattle/orchestrator.js");
    expect(stop).toHaveBeenCalledTimes(1);
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
  });

  it("advances immediately when no timer and in cooldown", async () => {
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    __setStateSnapshot({ state: "cooldown" });
    const resolveReady = vi.fn();
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady });
    const dispatcher = await import("../../src/helpers/classicBattle/orchestrator.js");
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(resolveReady).toHaveBeenCalledTimes(1);
  });
});
