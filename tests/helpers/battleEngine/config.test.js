import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BattleEngine } from "../../../src/helpers/BattleEngine.js";

describe("BattleEngine configuration", () => {
  it("accepts custom config values", () => {
    const customStats = ["a", "b"];
    const getStateSnapshot = vi.fn().mockReturnValue({ log: ["x"] });
    const engine = new BattleEngine({
      pointsToWin: 2,
      maxRounds: 3,
      stats: customStats,
      debugHooks: { getStateSnapshot }
    });
    const snap = engine.getTimerStateSnapshot();
    expect(engine.pointsToWin).toBe(2);
    expect(engine.maxRounds).toBe(3);
    expect(engine.stats).toBe(customStats);
    expect(getStateSnapshot).toHaveBeenCalled();
    expect(snap.transitions).toEqual(["x"]);
  });

  it("uses provided maxRounds to end match", () => {
    const engine = new BattleEngine({ maxRounds: 1 });
    const res = engine.handleStatSelection(1, 1);
    expect(res.matchEnded).toBe(true);
  });

  it("does not import classic debug module", () => {
    const file = path.resolve(__dirname, "../../../src/helpers/BattleEngine.js");
    const content = fs.readFileSync(file, "utf8");
    expect(content).not.toMatch(/classicBattle\/battleDebug/);
  });
});
