import { test, expect } from "@playwright/test";

test.describe("Battle CLI Storage Debug", () => {
  test("debug storage and round selection logic", async ({ page }) => {
    // Test the specific storage logic that should trigger auto-start
    await page.addInitScript(() => {
      // Set the same storage values as the test
      localStorage.setItem("battleCLI.pointsToWin", "5");
      localStorage.setItem("battle.pointsToWin", "5");

      console.log("Set localStorage values:");
      console.log("battleCLI.pointsToWin:", localStorage.getItem("battleCLI.pointsToWin"));
      console.log("battle.pointsToWin:", localStorage.getItem("battle.pointsToWin"));
    });

    await page.goto("/src/pages/battleCLI.html");

    // Check what the round select modal logic is doing
    const storageDebug = await page.evaluate(() => {
      // Reproduce the exact logic from roundSelectModal.js
      const POINTS_TO_WIN_OPTIONS = [5, 10, 15];
      const BATTLE_POINTS_TO_WIN = "battle.pointsToWin";

      let saved;
      try {
        saved = localStorage.getItem(BATTLE_POINTS_TO_WIN);
      } catch {
        saved = null;
      }

      const numberSaved = Number(saved);
      const isValidOption = POINTS_TO_WIN_OPTIONS.includes(numberSaved);

      return {
        storedValue: saved,
        numberValue: numberSaved,
        isValidOption,
        pointsToWinOptions: POINTS_TO_WIN_OPTIONS,
        typeof_saved: typeof saved,
        typeof_numberSaved: typeof numberSaved
      };
    });

    console.log("Storage debug:", JSON.stringify(storageDebug, null, 2));

    // Check if there's a start button (which indicates modal logic didn't auto-start)
    const startButtonExists = await page.locator("#start-match-button").count();

    // Check the battle state
    const battleState = await page.evaluate(() => {
      return {
        bodyDataState: document.body?.dataset?.battleState,
        hasModal: !!document.querySelector('[role="dialog"]'),
        windowState: window.getStateSnapshot ? window.getStateSnapshot() : "no snapshot available"
      };
    });

    console.log("Battle state:", JSON.stringify(battleState, null, 2));
    console.log("Start button exists:", startButtonExists > 0);

    // The key insight: this should tell us if the storage logic is working correctly
    if (storageDebug.isValidOption) {
      console.log("✅ Storage value should trigger auto-start");
      expect(startButtonExists).toBe(0); // No start button should exist
      expect(battleState.hasModal).toBe(false); // No modal should exist
    } else {
      console.log("❌ Storage value not recognized - modal should show");
      expect(startButtonExists).toBe(1); // Start button should exist
      expect(battleState.hasModal).toBe(true); // Modal should exist
    }

    // Pass the test - we're just debugging
    expect(true).toBe(true);
  });
});
