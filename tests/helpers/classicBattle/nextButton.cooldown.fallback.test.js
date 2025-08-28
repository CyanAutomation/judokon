import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Next button cooldown fallback", () => {
  beforeEach(() => {
    document.body.innerHTML = `<button id="next-button">Next</button>`;
    window.__classicBattleState = "cooldown";
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("dispatches 'ready' when no timer controls exist", async () => {
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const orchestrator = await import("../../../src/helpers/classicBattle/battleDispatcher.js");
    const spy = vi.spyOn(orchestrator, "dispatchBattleEvent").mockResolvedValue(undefined);
    // Simulate click while not nextReady to take the no-timer path
    await mod.onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: vi.fn() });
    expect(spy).toHaveBeenCalledWith("ready");
  });
});
