import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("roundReadyState", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resets readiness tracking and dispatcher history", async () => {
    const resetDispatchHistory = vi.fn();
    vi.doMock("../../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      resetDispatchHistory
    }));
    const mod = await import("../../../src/helpers/classicBattle/roundReadyState.js");
    mod.setReadyDispatchedForCurrentCooldown(true);
    expect(mod.hasReadyBeenDispatchedForCurrentCooldown()).toBe(true);
    mod.resetReadyDispatchState();
    expect(mod.hasReadyBeenDispatchedForCurrentCooldown()).toBe(false);
    expect(resetDispatchHistory).toHaveBeenCalledWith("ready");
  });
});
