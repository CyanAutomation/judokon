import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";

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
  skipRoundCooldownIfEnabled: vi.fn(() => false),
  syncScoreDisplay: vi.fn()
}));

import { emitBattleEvent } from "../../../src/helpers/classicBattle/battleEvents.js";
import { onNextButtonClick } from "../../../src/helpers/classicBattle/timerService.js";

describe("Next button skipCooldown intent", () => {
  let warnSpy;
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    warnSpy.mockRestore();
    timers.cleanup();
    document.body.innerHTML = "";
  });

  it("emits skipCooldown when button exists", async () => {
    document.body.innerHTML = '<button id="next-button" data-role="next-round"></button>';
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    expect(emitBattleEvent).toHaveBeenCalledTimes(1);
    expect(emitBattleEvent).toHaveBeenNthCalledWith(1, "skipCooldown", {
      source: "next-button"
    });
  });

  it("does not emit skipCooldown when button missing", async () => {
    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    expect(emitBattleEvent).not.toHaveBeenCalled();
  });
});
