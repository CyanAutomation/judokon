import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock timer and renderer to observe calls without real timers
vi.mock("../../../src/helpers/CooldownRenderer.js", () => ({
  attachCooldownRenderer: vi.fn()
}));
vi.mock("../../../src/helpers/timers/createRoundTimer.js", () => ({
  createRoundTimer: vi.fn(() => ({
    on: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  }))
}));

describe("skipRoundCooldown feature flag", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("skips countdown when flag enabled", async () => {
    vi.doMock("../../../src/helpers/featureFlags.js", () => ({
      isEnabled: (flag) => flag === "skipRoundCooldown"
    }));
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");
    await import("../../../src/helpers/classicBattle/uiService.js");
    await battleEvents.emitBattleEvent("countdownStart", { duration: 3 });
    await Promise.resolve();
    const { attachCooldownRenderer } = await import("../../../src/helpers/CooldownRenderer.js");
    expect(attachCooldownRenderer).not.toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith("countdownFinished");
  });

  it("shows countdown when flag disabled", async () => {
    vi.doMock("../../../src/helpers/featureFlags.js", () => ({ isEnabled: () => false }));
    const battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");
    await import("../../../src/helpers/classicBattle/uiService.js");
    await battleEvents.emitBattleEvent("countdownStart", { duration: 3 });
    await Promise.resolve();
    const { attachCooldownRenderer } = await import("../../../src/helpers/CooldownRenderer.js");
    expect(attachCooldownRenderer).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledTimes(1); // only countdownStart
  });
});
