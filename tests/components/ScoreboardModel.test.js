import { describe, it, expect } from "vitest";
import { ScoreboardModel } from "../../src/components/ScoreboardModel.js";

describe("ScoreboardModel", () => {
  it("updates and exposes score state", () => {
    const model = new ScoreboardModel();
    model.updateScore(2, 3);
    const state = model.getState();
    expect(state.score.player).toBe(2);
    expect(state.score.opponent).toBe(3);
  });
});
