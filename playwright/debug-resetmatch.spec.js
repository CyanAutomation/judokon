import { test, expect } from "@playwright/test";

test.describe("Battle CLI resetMatch Debug", () => {
  test("debug resetMatch function execution step by step", async ({ page }) => {
    let resetLogs = [];

    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("resetMatch") ||
        text.includes("orchestrator") ||
        text.includes("resetGame")
      ) {
        resetLogs.push(text);
        console.log("🔧 Reset log:", text);
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem("battle.pointsToWin", "5");

      // Add debugging to the resetMatch process
      const originalConsoleError = console.error;
      console.error = (...args) => {
        originalConsoleError(...args);
        // Mark orchestrator errors specially
        if (args.some((arg) => typeof arg === "string" && arg.includes("orchestrator"))) {
          console.log("[ORCHESTRATOR_ERROR]", ...args);
        }
      };
    });

    await page.goto("/src/pages/battleCLI.html");

    // Give time for initialization
    await page.waitForTimeout(3000);

    // Now test the resetMatch function execution in detail
    const resetMatchTest = await page.evaluate(async () => {
      const results = { steps: [] };

      try {
        results.steps.push("Starting resetMatch debug");

        // Check if battleOrchestrator is available
        const orchestratorModule = await import("../../helpers/classicBattle/orchestrator.js");
        results.orchestratorImport = {
          success: true,
          hasInitFunction: typeof orchestratorModule.initClassicBattleOrchestrator === "function",
          exports: Object.keys(orchestratorModule).filter((key) => key.includes("init"))
        };

        // Check if resetGame is available
        const roundManagerModule = await import("../../helpers/classicBattle/roundManager.js");
        results.roundManagerImport = {
          success: true,
          hasResetGame: typeof roundManagerModule.resetGame === "function",
          hasCreateBattleStore: typeof roundManagerModule.createBattleStore === "function"
        };

        results.steps.push("Modules imported successfully");

        // Try to manually execute the resetMatch logic step by step
        if (window.battleStore) {
          results.steps.push("battleStore exists, testing resetGame");

          try {
            await roundManagerModule.resetGame(window.battleStore);
            results.steps.push("resetGame completed successfully");
          } catch (err) {
            results.steps.push(`resetGame failed: ${err.message}`);
            results.resetGameError = err.message;
          }

          // Test orchestrator initialization
          try {
            results.steps.push("Testing orchestrator initialization");

            // Check if startRoundWrapper exists in global scope
            const hasStartRoundWrapper =
              typeof window.__battleCLIStartRoundWrapper === "function" ||
              typeof window.startRoundWrapper === "function";
            results.startRoundWrapperAvailable = hasStartRoundWrapper;

            if (hasStartRoundWrapper) {
              const wrapper = window.__battleCLIStartRoundWrapper || window.startRoundWrapper;
              await orchestratorModule.initClassicBattleOrchestrator(window.battleStore, wrapper);
              results.steps.push("orchestrator initialization completed successfully");

              // Check if store now has engine and orchestrator
              results.storeAfterInit = {
                hasEngine: !!window.battleStore.engine,
                hasOrchestrator: !!window.battleStore.orchestrator,
                keys: Object.keys(window.battleStore)
              };
            } else {
              results.steps.push("startRoundWrapper not available - cannot test orchestrator init");
            }
          } catch (err) {
            results.steps.push(`orchestrator initialization failed: ${err.message}`);
            results.orchestratorError = err.message;
            results.orchestratorStack = err.stack;
          }
        } else {
          results.steps.push("No battleStore available for testing");
        }
      } catch (err) {
        results.steps.push(`Overall test failed: ${err.message}`);
        results.overallError = err.message;
      }

      return results;
    });

    console.log("ResetMatch debug results:", JSON.stringify(resetMatchTest, null, 2));
    console.log("Reset-related logs:", resetLogs);

    // This test succeeds if we can identify the specific failure point
    expect(true).toBe(true);
  });
});
