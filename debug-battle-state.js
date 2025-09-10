// Debug script to check battle state initialization
const { test, expect } = require("@playwright/test");

test.describe("Battle State Debug", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
        try {
          localStorage.setItem("battle.pointsToWin", "5");
        } catch {}
      } catch {}
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });
    await page.goto("/src/pages/battleCLI.html");
  });

  test("debug battle initialization", async ({ page }) => {
    // Wait a moment for initialization
    await page.waitForTimeout(2000);

    // Check the DOM state
    const startButton = await page.locator("#start-match-button").count();
    console.log("Start button count:", startButton);

    // Check battle state
    const battleState = await page.evaluate(() => {
      return {
        bodyDataset: document.body.dataset.battleState,
        hasStartButton: !!document.getElementById("start-match-button"),
        localStorage: {
          battlePointsToWin: localStorage.getItem("battle.pointsToWin"),
          battleCliPointsToWin: localStorage.getItem("battleCLI.pointsToWin")
        }
      };
    });

    console.log("Battle state debug:", JSON.stringify(battleState, null, 2));

    // Check if getStateSnapshot is available
    const stateSnapshot = await page.evaluate(() => {
      try {
        if (typeof window.getStateSnapshot === "function") {
          return window.getStateSnapshot();
        }
        return "getStateSnapshot not available";
      } catch (err) {
        return "Error: " + err.message;
      }
    });

    console.log("State snapshot:", JSON.stringify(stateSnapshot, null, 2));

    expect(true).toBe(true); // Just pass the test, we're debugging
  });
});
