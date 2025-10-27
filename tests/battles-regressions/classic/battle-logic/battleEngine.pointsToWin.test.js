import { describe, expect, it, beforeEach } from "vitest";
import { CLASSIC_BATTLE_POINTS_TO_WIN } from "../../src/helpers/constants.js";
import {
  createBattleEngine,
  getPointsToWin,
  setPointsToWin
} from "../../src/helpers/battleEngineFacade.js";

describe("battleEngine pointsToWin", () => {
  beforeEach(() => createBattleEngine());

  it("returns default points to win", () => {
    expect(getPointsToWin()).toBe(CLASSIC_BATTLE_POINTS_TO_WIN);
  });

  it("updates points to win", () => {
    setPointsToWin(5);
    expect(getPointsToWin()).toBe(5);
  });
});
