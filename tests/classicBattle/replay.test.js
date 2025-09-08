import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Enable console logs for debugging
const originalConsoleLog = console.log;
console.log = (...args) => {
  originalConsoleLog(...args);
};

describe("Classic Battle replay flow", () => {
  test("after match end, clicking Replay resets scoreboard", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    // Enable test mode for deterministic behavior
    const testMode = await import("../../src/helpers/testModeUtils.js");
    testMode.setTestMode(true, 42);
    
    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") mod.init();
    // Reduce points to win so one win ends the match
    const engine = await import("../../src/helpers/battleEngineFacade.js");
    engine.setPointsToWin?.(1);

    // Start match
    console.log("[test] Looking for round-select-2 button");
    const startBtn = await new Promise((r) => {
      let attempts = 0;
      const loop = () => {
        attempts++;
        const el = document.getElementById("round-select-2");
        console.log(`[test] Attempt ${attempts}: round-select-2 found:`, !!el);
        if (el) return r(el);
        if (attempts > 100) {
          console.log("[test] Giving up after 100 attempts");
          return r(null);
        }
        setTimeout(loop, 10);
      };
      loop();
    });
    console.log("[test] Start button:", !!startBtn);
    if (startBtn) {
      console.log("[test] Clicking start button");
      startBtn.click();
    } else {
      console.log("[test] No start button found, skipping click");
    }
    // Click first stat to win (deterministic values wired in init)
    await new Promise((r) => setTimeout(r, 10));
    const statButtons = document.querySelectorAll("#stat-buttons button[data-stat]");
    const statButton = statButtons[0];
    console.log("[test] Stat buttons found:", statButtons.length);
    console.log("[test] First stat button:", statButton?.textContent, statButton?.dataset?.stat);
    console.log("[test] Button disabled:", statButton?.disabled);
    console.log("[test] Clicking stat button");
    
    // Add event listener to see if handleStatSelection is called
    const { onBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    onBattleEvent("statSelected", (e) => {
      console.log("[test] statSelected event received:", e.detail);
    });
    onBattleEvent("roundResolved", (e) => {
      console.log("[test] roundResolved event received:", e.detail);
    });
    onBattleEvent("display.score.update", (e) => {
      console.log("[test] display.score.update event received:", e.detail);
    });
    
    statButton?.click();
    // Wait a moment for outcome
    await new Promise((r) => setTimeout(r, 60));
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
    // Round counter may be managed by orchestrator; ensure at least score reset
  });
});
