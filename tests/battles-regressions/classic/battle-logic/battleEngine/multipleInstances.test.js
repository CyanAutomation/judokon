import { describe, it, expect, vi } from "vitest";
import { BattleEngine } from "../../../src/helpers/BattleEngine.js";

describe("BattleEngine multiple instances", () => {
  it("operate independently", () => {
    const engineA = new BattleEngine({ pointsToWin: 1, stats: ["a"] });
    const engineB = new BattleEngine({ pointsToWin: 2, stats: ["b"] });
    const aEnd = vi.fn();
    const bEnd = vi.fn();
    engineA.on("matchEnded", aEnd);
    engineB.on("matchEnded", bEnd);

    engineA.handleStatSelection(10, 5);
    expect(engineA.matchEnded).toBe(true);
    expect(engineB.matchEnded).toBe(false);
    expect(aEnd).toHaveBeenCalled();
    expect(bEnd).not.toHaveBeenCalled();
    expect(engineB.playerScore).toBe(0);

    engineB.handleStatSelection(10, 5);
    expect(engineB.matchEnded).toBe(false);
    engineB.handleStatSelection(8, 4);
    expect(engineB.matchEnded).toBe(true);
    expect(bEnd).toHaveBeenCalledTimes(1);
    expect(aEnd).toHaveBeenCalledTimes(1);
    expect(engineA.stats).toEqual(["a"]);
    expect(engineB.stats).toEqual(["b"]);
  });
});
