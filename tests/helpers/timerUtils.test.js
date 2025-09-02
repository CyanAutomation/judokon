// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("timerUtils", () => {
  it("returns the default timer for a category", async () => {
    vi.doMock("../../src/data/gameTimers.js", () => ({
      default: [
        { id: 1, value: 10, default: false, category: "roundTimer" },
        { id: 2, value: 20, default: true, category: "roundTimer" }
      ]
    }));
    const { getDefaultTimer } = await import("../../src/helpers/timerUtils.js");
    const val1 = await getDefaultTimer("roundTimer");
    const val2 = await getDefaultTimer("roundTimer");
    expect(val1).toBe(20);
    expect(val2).toBe(20);
  });
});
