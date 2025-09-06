import { describe, it, expect, afterEach, vi } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI round header", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await cleanupBattleCLI();
  });

  it("updates round header each round", async () => {
    const mod = await loadBattleCLI();
    const roundManager = await import("../../src/helpers/classicBattle/roundManager.js");
    vi.spyOn(roundManager, "startRound").mockResolvedValue({ playerJudoka: null, roundNumber: 2 });
    await mod.startRoundWrapper();
    expect(document.getElementById("cli-round").textContent).toBe("Round 2 Target: 10 🏆");
    const root = document.getElementById("cli-root");
    expect(root.getAttribute("data-round")).toBe("2");
    expect(root.getAttribute("data-target")).toBe("10");
  });
});
