// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

describe("battleEngine startCoolDown", () => {
  it("runs countdown using default timer", async () => {
    vi.doMock("../../src/helpers/timerUtils.js", async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        getDefaultTimer: vi.fn().mockResolvedValue(3),
        createCountdownTimer: vi.fn(() => ({
          start: vi.fn(),
          stop: vi.fn(),
          pause: vi.fn(),
          resume: vi.fn()
        }))
      };
    });
    const { startCoolDown, _resetForTest } = await import(
      "../../src/helpers/battleEngineFacade.js"
    );
    const timerUtils = await import("../../src/helpers/timerUtils.js");
    _resetForTest();
    await startCoolDown(vi.fn(), vi.fn());
    expect(timerUtils.createCountdownTimer).toHaveBeenCalledWith(3, expect.any(Object));
    expect(timerUtils.createCountdownTimer.mock.results[0].value.start).toHaveBeenCalled();
  });
});
