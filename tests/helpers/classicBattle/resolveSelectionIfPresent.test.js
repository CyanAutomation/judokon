import { describe, it, expect, vi } from "vitest";

vi.mock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
  getOpponentJudoka: () => ({ stats: { speed: 40 } })
}));

const getStatValue = vi.fn(() => 0);
vi.mock("../../../src/helpers/battle/score.js", () => ({ getStatValue }));

const resolveRound = vi.fn();
vi.mock("../../../src/helpers/classicBattle/roundResolver.js", () => ({ resolveRound }));

describe("resolveSelectionIfPresent", () => {
  it("uses store judoka stats when DOM is missing", async () => {
    const { resolveSelectionIfPresent } = await import(
      "../../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    const store = {
      playerChoice: "speed",
      currentPlayerJudoka: { stats: { speed: 50 } }
    };
    const resolved = await resolveSelectionIfPresent(store);
    expect(resolved).toBe(true);
    expect(resolveRound).toHaveBeenCalledWith(store, "speed", 50, 40);
    expect(getStatValue).not.toHaveBeenCalledWith(null, "speed");
  });

  it("falls back to DOM when store judoka missing", async () => {
    getStatValue.mockReset();
    vi.doMock("../../../src/helpers/classicBattle/cardSelection.js", () => ({
      getOpponentJudoka: () => null
    }));
    vi.resetModules();
    const { resolveSelectionIfPresent } = await import(
      "../../../src/helpers/classicBattle/orchestratorHandlers.js"
    );
    const p = document.createElement("div");
    p.id = "player-card";
    const o = document.createElement("div");
    o.id = "opponent-card";
    document.body.append(p, o);
    getStatValue.mockReturnValueOnce(10).mockReturnValueOnce(20);
    const store = { playerChoice: "speed", currentPlayerJudoka: null };
    await resolveSelectionIfPresent(store);
    expect(getStatValue).toHaveBeenCalledWith(p, "speed");
    expect(getStatValue).toHaveBeenCalledWith(o, "speed");
    expect(resolveRound).toHaveBeenLastCalledWith(store, "speed", 10, 20);
  });
});
