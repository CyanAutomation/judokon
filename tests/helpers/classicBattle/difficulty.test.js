import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { STATS } from "../../../src/helpers/battleEngineFacade.js";
vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

describe("simulateOpponentStat difficulty", () => {
  let simulateOpponentStat;
  let stats;

  beforeEach(async () => {
    stats = { power: 1, speed: 2, technique: 3, kumikata: 4, newaza: 5 };
    ({ simulateOpponentStat } = await import("../../../src/helpers/classicBattle.js"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a random stat on easy", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const stat = simulateOpponentStat(stats, "easy");
    expect(STATS.includes(stat)).toBe(true);
  });

  it("chooses among stats at or above average on medium", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const stat = simulateOpponentStat(stats, "medium");
    expect(["technique", "kumikata", "newaza"]).toContain(stat);
  });

  it("chooses the highest stat on hard", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const stat = simulateOpponentStat(stats, "hard");
    expect(stat).toBe("newaza");
  });
});
