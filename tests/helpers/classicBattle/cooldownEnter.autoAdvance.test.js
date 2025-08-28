import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../../src/helpers/classicBattle/timerService.js", () => ({
  computeNextRoundCooldown: vi.fn(() => 1),
  getNextRoundControls: vi.fn(() => null)
}));

import { cooldownEnter } from "../../../src/helpers/classicBattle/orchestratorHandlers.js";

describe("cooldownEnter", () => {
  let timerSpy;
  let machine;
  beforeEach(() => {
    timerSpy = vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    machine = { dispatch: vi.fn(), getState: vi.fn(() => "cooldown"), context: {} };
  });
  afterEach(() => {
    timerSpy.clearAllTimers();
    vi.restoreAllMocks();
  });
  it("auto dispatches ready after 1s timer", async () => {
    await cooldownEnter(machine);
    expect(machine.dispatch).not.toHaveBeenCalled();
    await timerSpy.advanceTimersByTimeAsync(1200); // 1s duration + 200ms fallback
    expect(machine.dispatch).toHaveBeenCalledWith("ready");
  });
});
