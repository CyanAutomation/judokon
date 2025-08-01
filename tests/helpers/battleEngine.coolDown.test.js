import { describe, it, expect, vi } from "vitest";

vi.useFakeTimers();

describe("battleEngine startCoolDown", () => {
  it("runs countdown using default timer", async () => {
    vi.doMock("../../src/helpers/timerUtils.js", async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        getDefaultTimer: vi.fn().mockResolvedValue(3)
      };
    });
    const { startCoolDown, _resetForTest } = await import("../../src/helpers/battleEngine.js");
    const onTick = vi.fn();
    const onExpired = vi.fn();
    _resetForTest();
    await startCoolDown(onTick, onExpired);
    expect(onTick).toHaveBeenCalledWith(3);
    vi.advanceTimersByTime(3000);
    expect(onExpired).toHaveBeenCalled();
  });
});
