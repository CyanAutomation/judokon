import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle replay flow", () => {
  test("after match end, clicking Replay resets scoreboard", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    // Initialize the page
    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") {
      await mod.init();
    }

    // Reduce points to win so one win ends the match
    const engine = await import("../../src/helpers/battleEngineFacade.js");
    engine.setPointsToWin?.(1);

    // Wait for stat buttons to be ready
    await new Promise((r) => setTimeout(r, 100));

    // Simulate clicking a stat button instead of calling engine directly
    console.log("[test] Looking for stat buttons");
    const statButtons = document.querySelectorAll("#stat-buttons button[data-stat]");
    console.log("[test] Found stat buttons:", statButtons.length);

    if (statButtons.length > 0) {
      console.log("[test] Clicking first stat button");
      statButtons[0].click();
    } else {
      // Fallback: use the evaluateRound function directly
      console.log("[test] No stat buttons found, using evaluateRound fallback");
      const { evaluateRound } = await import("../../src/helpers/api/battleUI.js");
      const result = evaluateRound(5, 3);
      console.log("[test] Battle result:", result);
    }

    // Wait a moment for events to propagate
    await new Promise((r) => setTimeout(r, 50));

    const score = document.getElementById("score-display");
    console.log("[test] Score after stat selection:", score?.textContent);
    expect(score.textContent || "").toMatch(/You:\s*1/);

    // Click Replay
    console.log("[test] Clicking replay button");
    document.getElementById("replay-button")?.click();
    await new Promise((r) => setTimeout(r, 50));
    console.log("[test] Score after replay:", score?.textContent);
    expect(score.textContent || "").toMatch(/You:\s*0/);
    expect(score.textContent || "").toMatch(/Opponent:\s*0/);
  });
});
