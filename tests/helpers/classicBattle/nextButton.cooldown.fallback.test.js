import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Next button cooldown fallback", () => {
  beforeEach(async () => {
    document.body.innerHTML = `<button id="next-button" data-role="next-round">Next</button>`;
    const { onBattleEvent, emitBattleEvent, __resetBattleEventTarget } = await import(
      "../../../src/helpers/classicBattle/battleEvents.js"
    );
    const { createDebugLogListener } = await import(
      "../../../src/helpers/classicBattle/stateTransitionListeners.js"
    );
    __resetBattleEventTarget();
    onBattleEvent("battleStateChange", createDebugLogListener(null));
    emitBattleEvent("battleStateChange", { from: null, to: "cooldown", event: null });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("dispatches 'ready' when no timer controls exist", async () => {
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const dispatcher = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const spy = vi.spyOn(dispatcher, "dispatchBattleEvent").mockResolvedValue(undefined);
    // Simulate click while not nextReady to take the no-timer path
    await mod.onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: vi.fn() });
    expect(spy).toHaveBeenCalledWith("ready");
  });
});
