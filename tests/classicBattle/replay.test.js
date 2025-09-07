import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle replay flow", () => {
  test("after match end, clicking Replay resets scoreboard", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") mod.init();
    // Reduce points to win so one win ends the match
    const engine = await import("../../src/helpers/battleEngineFacade.js");
    engine.setPointsToWin?.(1);

    // Start match
    const startBtn = await new Promise((r) => {
      const loop = () => {
        const el = document.getElementById("round-select-2");
        if (el) return r(el);
        setTimeout(loop, 0);
      };
      loop();
    });
    startBtn.click();
    // Click first stat to win (deterministic values wired in init)
    await new Promise((r) => setTimeout(r, 10));
    document.querySelector("#stat-buttons button[data-stat]")?.click();
    // Wait a moment for outcome
    await new Promise((r) => setTimeout(r, 60));
    const score = document.getElementById("score-display");
    expect(score.textContent || "").toMatch(/You:\s*1/);

    // Click Replay
    document.getElementById("replay-button")?.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(score.textContent || "").toMatch(/You:\s*0/);
    expect(score.textContent || "").toMatch(/Opponent:\s*0/);
    // Round counter may be managed by orchestrator; ensure at least score reset
  });
});
