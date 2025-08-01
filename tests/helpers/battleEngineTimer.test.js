import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockTimers = [{ id: 1, value: 42, default: true, category: "roundTimer" }];

let timerSpy;

beforeEach(() => {
  vi.resetModules();
  timerSpy = vi.useFakeTimers();
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue(mockTimers),
    importJsonModule: vi.fn()
  }));
});

afterEach(() => {
  vi.clearAllTimers();
});

describe("timer defaults", () => {
  it("resolves default timer value from gameTimers.json", async () => {
    const { getDefaultTimer, _resetForTest } = await import("../../src/helpers/timerUtils.js");
    _resetForTest();
    const val = await getDefaultTimer("roundTimer");
    expect(val).toBe(42);
  });

  it("startRound uses default duration when none provided", async () => {
    const { startRound, _resetForTest } = await import("../../src/helpers/battleEngine.js");
    const { _resetForTest: resetTimerUtils } = await import("../../src/helpers/timerUtils.js");
    resetTimerUtils();
    _resetForTest();
    const onTick = vi.fn();
    await startRound(onTick, vi.fn());
    expect(onTick).toHaveBeenCalledWith(42);
  });
});
