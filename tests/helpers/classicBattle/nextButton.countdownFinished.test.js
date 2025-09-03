import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/helpers/classicBattle/orchestrator.js", () => ({
  dispatchBattleEvent: vi.fn(() => Promise.resolve())
}));
vi.mock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
  setSkipHandler: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));
vi.mock("../../../src/helpers/classicBattle/uiHelpers.js", () => ({
  skipRoundCooldownIfEnabled: vi.fn(() => false)
}));

import { emitBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";
import { onNextButtonClick } from "../../../src/helpers/classicBattle/timerService.js";

describe("Next button countdownFinished", () => {
  let warnSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    warnSpy.mockRestore();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("emits countdownFinished when button exists", async () => {
    document.body.innerHTML = '<button id="next-button" data-role="next-round"></button>';
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    expect(emitBattleEvent).toHaveBeenCalledTimes(1);
    expect(emitBattleEvent).toHaveBeenCalledWith("countdownFinished");
  });

  it("emits countdownFinished when button missing", async () => {
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    expect(emitBattleEvent).toHaveBeenCalledTimes(1);
    expect(emitBattleEvent).toHaveBeenCalledWith("countdownFinished");
  });
});
