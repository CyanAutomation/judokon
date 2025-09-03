import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI round header", () => {
  afterEach(async () => {
    await cleanupBattleCLI();
  });

  it("updates round header each round", async () => {
    const mod = await loadBattleCLI();
    const { startRound } = await import("../../src/helpers/classicBattle/roundManager.js");
    startRound.mockResolvedValue({ playerJudoka: null, roundNumber: 2 });
    await mod.__test.startRoundWrapper();
    expect(document.getElementById("cli-round").textContent).toBe("Round 2 Target: 10 🏆");
    const root = document.getElementById("cli-root");
    expect(root.dataset.round).toBe("2");
    expect(root.dataset.target).toBe("10");
  });

  it("battleCLI.html exposes required selectors", () => {
    const html = readFileSync("src/pages/battleCLI.html", "utf8");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("#cli-countdown")).toBeTruthy();
    expect(doc.querySelector("#round-message")).toBeTruthy();
    expect(doc.querySelector("#cli-score")).toBeTruthy();
    const root = doc.querySelector("#cli-root");
    expect(root?.getAttribute("data-round")).not.toBeNull();
    expect(root?.getAttribute("data-target")).not.toBeNull();
    expect(doc.querySelector("#cli-countdown")?.getAttribute("data-remaining-time")).not.toBeNull();
  });
});
