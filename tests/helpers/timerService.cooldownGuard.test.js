import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { mount, clearBody } from "./domUtils.js";

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
vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));
vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  skipRoundCooldownIfEnabled: vi.fn(() => false)
}));

describe("onNextButtonClick cooldown guard", () => {
  let btn;
  let consoleMocks;
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
    const { query } = mount('<button id="next-button" data-role="next-round"></button>');
    btn = query('[data-role="next-round"]');
    vi.clearAllMocks();

    // Set up console monitoring for testing expected output
    consoleMocks = {
      warn: vi.spyOn(console, "warn").mockImplementation(() => {})
    };
  });

  afterEach(() => {
    timers.cleanup();
    // Clean up console spies
    consoleMocks.warn.mockRestore();
    clearBody();
  });

  it("does not warn when state changes", async () => {
    __setStateSnapshot({ state: "cooldown" });
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    btn.dataset.nextReady = "true";
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    __setStateSnapshot({ state: "roundDecision" });
    await vi.runAllTimersAsync();
    expect(consoleMocks.warn).not.toHaveBeenCalled();
  });

  it("warns if still in cooldown", async () => {
    __setStateSnapshot({ state: "cooldown" });
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    btn.dataset.nextReady = "true";
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    await vi.runAllTimersAsync();
    expect(consoleMocks.warn).toHaveBeenCalledWith("[next] stuck in cooldown");
  });

  it("clears previous warning timer on rapid clicks", async () => {
    __setStateSnapshot({ state: "cooldown" });
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    btn.dataset.nextReady = "true";
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    btn.dataset.nextReady = "true";
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    await vi.runAllTimersAsync();
    expect(consoleMocks.warn).toHaveBeenCalledTimes(1);
  });

  it("resets warning timer after firing", async () => {
    __setStateSnapshot({ state: "cooldown" });
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    btn.dataset.nextReady = "true";
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    await vi.runAllTimersAsync();
    expect(consoleMocks.warn).toHaveBeenCalledTimes(1);
    // Reset button state before second click (advanceWhenReady leaves button disabled)
    btn.disabled = false;
    btn.dataset.nextReady = "true";
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    await vi.runAllTimersAsync();
    expect(consoleMocks.warn).toHaveBeenCalledTimes(2);
  });
});
