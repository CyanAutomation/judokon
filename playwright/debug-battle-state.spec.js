// Debug script to check battle state initialization
import { test, expect } from "@playwright/test";

test.describe("Battle State Debug", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("battleCLI.pointsToWin", JSON.stringify(5));
        try {
          localStorage.setItem("battle.pointsToWin", JSON.stringify(5));
        } catch {}
      } catch {}
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });
    await page.goto("/src/pages/battleCLI.html");
  });

  test("debug battle initialization", async ({ page }) => {
    // Add debugging to see what functions are called during init
    await page.evaluate(() => {
      window.debugLog = [];

      // Hook into console to capture logs
      const originalConsoleLog = console.log;
      console.log = (...args) => {
        window.debugLog.push(["log", ...args]);
        originalConsoleLog.apply(console, args);
      };

      const originalConsoleError = console.error;
      console.error = (...args) => {
        window.debugLog.push(["error", ...args]);
        originalConsoleError.apply(console, args);
      };
    });

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

    // Debug the storage wrapper
    const storageDebug = await page.evaluate(() => {
      try {
        // Import the storage wrapper and check what it returns
        const BATTLE_POINTS_TO_WIN = "battle.pointsToWin";
        const raw = localStorage.getItem(BATTLE_POINTS_TO_WIN);
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          parsed = "Parse error: " + e.message;
        }

        return {
          raw: raw,
          parsed: parsed,
          type: typeof parsed,
          isIncluded: [5, 10, 15].includes(Number(parsed))
        };
      } catch (err) {
        return "Error: " + err.message;
      }
    });

    console.log("Storage debug:", JSON.stringify(storageDebug, null, 2));

    // Check debug logs
    const debugLogs = await page.evaluate(() => window.debugLog || []);
    console.log("Debug logs:", JSON.stringify(debugLogs, null, 2));

    expect(true).toBe(true); // Just pass the test, we're debugging
  });
});
