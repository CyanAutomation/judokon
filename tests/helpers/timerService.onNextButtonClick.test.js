import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/helpers/classicBattle/battleDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn(() => Promise.resolve())
}));

vi.mock("../../src/helpers/classicBattle/skipHandler.js", () => ({
  setSkipHandler: vi.fn()
}));

describe("onNextButtonClick", () => {
  let btn;

  beforeEach(() => {
    document.body.innerHTML = '<button id="next-button"></button>';
    btn = document.getElementById("next-button");
    vi.clearAllMocks();
  });

  it("advances when button is marked ready", async () => {
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    btn.dataset.nextReady = "true";
    window.__classicBattleState = "cooldown";
    const resolveReady = vi.fn();
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady });
    const dispatcher = await import("../../src/helpers/classicBattle/battleDispatcher.js");
    expect(btn.disabled).toBe(true);
    expect(btn.dataset.nextReady).toBeUndefined();
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(resolveReady).toHaveBeenCalledTimes(1);
  });

  it("stops timer when not ready", async () => {
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    const stop = vi.fn();
    window.__classicBattleState = "roundDecision";
    await onNextButtonClick(new MouseEvent("click"), { timer: { stop }, resolveReady: null });
    const dispatcher = await import("../../src/helpers/classicBattle/battleDispatcher.js");
    expect(stop).toHaveBeenCalledTimes(1);
    expect(dispatcher.dispatchBattleEvent).not.toHaveBeenCalled();
  });

  it("advances immediately when no timer and in cooldown", async () => {
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    window.__classicBattleState = "cooldown";
    const resolveReady = vi.fn();
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady });
    const dispatcher = await import("../../src/helpers/classicBattle/battleDispatcher.js");
    expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(resolveReady).toHaveBeenCalledTimes(1);
  });
});
