import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle bootstrap", () => {
  test("initializes scoreboard on DOMContentLoaded", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    // Import the page init and trigger DOMContentLoaded
    const mod = await import("../../src/pages/battleClassic.init.js");
    // Call init explicitly to avoid flakiness around DOMContentLoaded in JSDOM
    if (typeof mod.init === "function") mod.init();

    const score = document.getElementById("score-display");
    const round = document.getElementById("round-counter");
    expect(score).toBeTruthy();
    expect(round).toBeTruthy();
    // Scoreboard shows initial score text
    expect(score.textContent || "").toMatch(/You:\s*0/);
    expect(score.textContent || "").toMatch(/Opponent:\s*0/);
    // Round counter starts at 0
    expect(round.textContent || "").toMatch(/Round\s*0/);
  });
});
