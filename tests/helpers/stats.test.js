// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
const originalFetch = global.fetch;

const sample = [
  {
    id: 12,
    statIndex: 2,
    name: "Speed",
    category: "Judo",
    japanese: "S",
    description: ""
  },
  {
    id: 11,
    statIndex: 1,
    name: "Power",
    category: "Judo",
    japanese: "P",
    description: ""
  },
  {
    id: 99,
    statIndex: 1,
    name: "Other",
    category: "Other",
    japanese: "O",
    description: ""
  }
];

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("stats helper", () => {
  it("loads and caches stat names", async () => {
    const fetchJson = vi.fn().mockResolvedValue(sample);
    vi.doMock("../../src/helpers/dataUtils.js", () => ({ fetchJson }));
    const { loadStatNames } = await import("../../src/helpers/stats.js");
    const first = await loadStatNames();
    const second = await loadStatNames();
    expect(first.map((s) => s.name)).toEqual(["Power", "Speed"]);
    expect(second).toEqual(first);
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });

  it("gets label by key", async () => {
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue(sample)
    }));
    const { getStatLabel } = await import("../../src/helpers/stats.js");
    const label = await getStatLabel("speed");
    expect(label).toBe("Speed");
  });

  it("returns the five Judo stats in order", async () => {
    vi.doMock(
      "../../src/helpers/dataUtils.js",
      async () => await vi.importActual("../../src/helpers/dataUtils.js")
    );
    const fetchMock = vi.fn();
    global.fetch = fetchMock;
    const { loadStatNames } = await import("../../src/helpers/stats.js");
    const stats = await loadStatNames();
    expect(stats.map((s) => s.name)).toEqual([
      "Power",
      "Speed",
      "Technique",
      "Kumi-kata",
      "Ne-waza"
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
