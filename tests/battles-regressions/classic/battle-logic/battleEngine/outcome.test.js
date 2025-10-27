import { describe, it, expect, beforeEach } from "vitest";
import {
  BattleEngine,
  determineOutcome,
  applyOutcome,
  OUTCOME
} from "../../../src/helpers/BattleEngine.js";

describe("determineOutcome", () => {
  it("returns player win when player value higher", () => {
    expect(determineOutcome(5, 3)).toEqual({ delta: 2, outcome: OUTCOME.WIN_PLAYER });
  });

  it("returns opponent win when opponent value higher", () => {
    expect(determineOutcome(3, 5)).toEqual({ delta: -2, outcome: OUTCOME.WIN_OPPONENT });
  });

  it("returns draw when values equal", () => {
    expect(determineOutcome(4, 4)).toEqual({ delta: 0, outcome: OUTCOME.DRAW });
  });
});

describe("applyOutcome", () => {
  let engine;
  beforeEach(() => {
    engine = new BattleEngine();
  });

  it("increments player score on player win", () => {
    applyOutcome(engine, { outcome: OUTCOME.WIN_PLAYER });
    expect(engine.playerScore).toBe(1);
    expect(engine.opponentScore).toBe(0);
  });

  it("increments opponent score on opponent win", () => {
    applyOutcome(engine, { outcome: OUTCOME.WIN_OPPONENT });
    expect(engine.playerScore).toBe(0);
    expect(engine.opponentScore).toBe(1);
  });

  it("leaves scores unchanged on draw", () => {
    applyOutcome(engine, { outcome: OUTCOME.DRAW });
    expect(engine.playerScore).toBe(0);
    expect(engine.opponentScore).toBe(0);
  });
});

describe("BattleEngine handleStatSelection", () => {
  let engine;
  beforeEach(() => {
    engine = new BattleEngine();
  });

  it("handles player win", () => {
    const res = engine.handleStatSelection(5, 3);
    expect(res).toMatchObject({
      outcome: OUTCOME.WIN_PLAYER,
      delta: 2,
      matchEnded: false,
      playerScore: 1,
      opponentScore: 0
    });
  });

  it("handles opponent win", () => {
    const res = engine.handleStatSelection(3, 5);
    expect(res).toMatchObject({
      outcome: OUTCOME.WIN_OPPONENT,
      delta: -2,
      playerScore: 0,
      opponentScore: 1
    });
  });

  it("handles tie", () => {
    const res = engine.handleStatSelection(4, 4);
    expect(res).toMatchObject({
      outcome: OUTCOME.DRAW,
      delta: 0,
      playerScore: 0,
      opponentScore: 0
    });
  });

  it("ends match when points threshold reached", () => {
    engine.setPointsToWin(1);
    const res = engine.handleStatSelection(5, 3);
    expect(res.matchEnded).toBe(true);
    expect(res.outcome).toBe(OUTCOME.MATCH_WIN_PLAYER);
  });
});
