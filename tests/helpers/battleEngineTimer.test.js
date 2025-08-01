import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTimers = [{ id: 1, value: 42, default: true, category: "roundTimer" }];

beforeEach(() => {
  vi.resetModules();
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue(mockTimers),
    importJsonModule: vi.fn()
  }));
});

describe("timer defaults", () => {
  it("resolves default timer value from gameTimers.json", async () => {
    const { getDefaultTimer, _resetForTest } = await import("../../src/helpers/timerUtils.js");
    _resetForTest();
    const val = await getDefaultTimer("roundTimer");
    expect(val).toBe(42);
  });

  it("startRound uses default duration when none provided", async () => {
    vi.doMock("../../src/helpers/timerUtils.js", async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        getDefaultTimer: vi.fn().mockResolvedValue(42),
        createCountdownTimer: vi.fn(() => ({
          start: vi.fn(),
          stop: vi.fn(),
          pause: vi.fn(),
          resume: vi.fn()
        }))
      };
    });

    const { startRound, _resetForTest } = await import("../../src/helpers/battleEngine.js");
    const timerUtils = await import("../../src/helpers/timerUtils.js");
    _resetForTest();

    await startRound(vi.fn(), vi.fn());

    expect(timerUtils.createCountdownTimer).toHaveBeenCalledWith(42, expect.any(Object));
    expect(timerUtils.createCountdownTimer.mock.results[0].value.start).toHaveBeenCalled();
  });
});
