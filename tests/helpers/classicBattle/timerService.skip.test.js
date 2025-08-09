import { describe, it, expect, vi } from "vitest";

describe("timerService pending skip", () => {
  it("fires handler once registered after pending skip", async () => {
    vi.resetModules();
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    const handler = vi.fn();
    mod.skipCurrentPhase();
    mod.setSkipHandler(handler);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
