// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const originalFetch = global.fetch;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("stats helper", () => {
  it("loads and caches stat names", async () => {
    const { loadStatNames } = await import("../../src/helpers/stats.js");
    const first = await loadStatNames();
    const second = await loadStatNames();
    expect(first.map((s) => s.name)).toEqual([
      "Power",
      "Speed",
      "Technique",
      "Kumi-kata",
      "Ne-waza"
    ]);
    expect(second).toEqual(first);
  });

  it("gets label by key", async () => {
    const { getStatLabel } = await import("../../src/helpers/stats.js");
    const label = await getStatLabel("speed");
    expect(label).toBe("Speed");
  });

  it("does not use fetch when loading stat names", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const { loadStatNames } = await import("../../src/helpers/stats.js");
    await loadStatNames();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
