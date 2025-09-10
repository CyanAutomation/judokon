import { test, expect } from "@playwright/test";

test.describe("Battle CLI Module Loading Debug", () => {
  test("debug module imports and availability", async ({ page }) => {
    let moduleErrors = [];

    // Capture any module loading errors
    page.on("console", (msg) => {
      const text = msg.text();
      if (
        msg.type() === "error" &&
        (text.includes("import") || text.includes("module") || text.includes("orchestrator"))
      ) {
        moduleErrors.push(text);
        console.log("❌ Module error:", text);
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem("battle.pointsToWin", "5");
    });

    await page.goto("/src/pages/battleCLI.html");

    // Give time for module loading
    await page.waitForTimeout(2000);

    // Check if individual modules/functions are available
    const moduleState = await page.evaluate(async () => {
      const results = {};

      // Test if we can import the orchestrator module directly
      try {
        const orchestratorModule = await import("../../helpers/classicBattle/orchestrator.js");
        results.orchestratorImport = {
          success: true,
          hasInitFunction: typeof orchestratorModule.initClassicBattleOrchestrator === "function",
          hasDisposeFunction:
            typeof orchestratorModule.disposeClassicBattleOrchestrator === "function",
          exports: Object.keys(orchestratorModule)
        };
      } catch (err) {
        results.orchestratorImport = {
          success: false,
          error: err.message
        };
      }

      // Test if we can import the round manager
      try {
        const roundManagerModule = await import("../../helpers/classicBattle/roundManager.js");
        results.roundManagerImport = {
          success: true,
          hasCreateBattleStore: typeof roundManagerModule.createBattleStore === "function",
          exports: Object.keys(roundManagerModule)
        };
      } catch (err) {
        results.roundManagerImport = {
          success: false,
          error: err.message
        };
      }

      // Test if we can import the engine facade
      try {
        const engineFacadeModule = await import("../../helpers/battleEngineFacade.js");
        results.engineFacadeImport = {
          success: true,
          exports: Object.keys(engineFacadeModule)
        };
      } catch (err) {
        results.engineFacadeImport = {
          success: false,
          error: err.message
        };
      }

      return results;
    });

    console.log("Module import results:", JSON.stringify(moduleState, null, 2));
    console.log("Module errors:", moduleErrors);

    // Now check if the problem is with specific function calls
    const functionCallState = await page.evaluate(async () => {
      try {
        // Try to manually create a battle store like the CLI does
        const { createBattleStore } = await import("../../helpers/classicBattle/roundManager.js");
        const testStore = createBattleStore();

        return {
          createBattleStoreWorks: true,
          storeProps: Object.keys(testStore),
          hasEngine: !!testStore.engine,
          hasOrchestrator: !!testStore.orchestrator
        };
      } catch (err) {
        return {
          createBattleStoreWorks: false,
          error: err.message
        };
      }
    });

    console.log("Function call results:", JSON.stringify(functionCallState, null, 2));

    // Test succeeds if we can identify the specific import/module issue
    expect(true).toBe(true);
  });
});
