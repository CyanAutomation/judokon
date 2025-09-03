import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let mockState = "cooldown";
vi.mock("../../src/helpers/classicBattle/battleDebug.js", () => ({
  getStateSnapshot: () => ({ state: mockState }),
  __setStateSnapshot: (next) => {
    mockState = next.state;
  }
}));
import { __setStateSnapshot } from "../../src/helpers/classicBattle/battleDebug.js";

vi.mock("../../src/helpers/classicBattle/orchestrator.js", () => ({
  dispatchBattleEvent: vi.fn(() => Promise.resolve())
}));

vi.mock("../../src/helpers/classicBattle/skipHandler.js", () => ({
  setSkipHandler: vi.fn()
}));

describe("onNextButtonClick cooldown guard", () => {
  let btn;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<button id="next-button" data-testid="next-button"></button>';
    btn = document.querySelector('[data-testid="next-button"]');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not warn when state changes", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    __setStateSnapshot({ state: "cooldown" });
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    btn.dataset.nextReady = "true";
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    __setStateSnapshot({ state: "roundDecision" });
    await vi.runAllTimersAsync();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("warns if still in cooldown", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    __setStateSnapshot({ state: "cooldown" });
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    btn.dataset.nextReady = "true";
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    await vi.runAllTimersAsync();
    expect(warnSpy).toHaveBeenCalledWith("[next] stuck in cooldown");
    warnSpy.mockRestore();
  });

  it("clears previous warning timer on rapid clicks", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    __setStateSnapshot({ state: "cooldown" });
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    btn.dataset.nextReady = "true";
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    btn.dataset.nextReady = "true";
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    await vi.runAllTimersAsync();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
