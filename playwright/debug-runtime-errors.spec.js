import { test, expect } from "@playwright/test";

test.describe("Battle CLI Error Detection", () => {
  test("capture all runtime errors during initialization", async ({ page }) => {
    let jsErrors = [];
    let unhandledPromiseRejections = [];
    let consoleErrors = [];

    // Capture JavaScript errors
    page.on("pageerror", (error) => {
      jsErrors.push(error.message);
      console.log("💥 Page error:", error.message);
      console.log("Stack:", error.stack);
    });

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
        console.log("🔴 Console error:", msg.text());
      }
    });

    // Add a script to capture unhandled promise rejections
    await page.addInitScript(() => {
      localStorage.setItem("battle.pointsToWin", "5");

      window.__unhandledRejections = [];

      window.addEventListener("unhandledrejection", (event) => {
        console.error("Unhandled promise rejection:", event.reason);
        window.__unhandledRejections.push({
          reason: event.reason?.message || String(event.reason),
          stack: event.reason?.stack
        });
      });

      // Also override Promise rejection to catch them
      const originalReject = Promise.reject;
      Promise.reject = function (reason) {
        console.log("Promise rejected with:", reason);
        return originalReject.call(this, reason);
      };
    });

    await page.goto("/src/pages/battleCLI.html");

    // Wait longer to let all initialization complete or fail
    await page.waitForTimeout(4000);

    // Check for unhandled rejections
    const unhandledRejections = await page.evaluate(() => {
      return window.__unhandledRejections || [];
    });

    // Get more details about the current state
    const detailedState = await page.evaluate(() => {
      // Try to manually call some of the initialization functions to see what fails
      const results = {};

      try {
        if (window.battleStore && typeof window.battleStore === "object") {
          results.storeKeys = Object.keys(window.battleStore);
          results.storeHasEngine = "engine" in window.battleStore;
          results.storeHasOrchestrator = "orchestrator" in window.battleStore;
          results.engineValue = window.battleStore.engine;
          results.orchestratorValue = window.battleStore.orchestrator;
        }
      } catch (err) {
        results.storeError = err.message;
      }

      // Check if resetPromise exists and its state
      try {
        if (window.__resetPromise) {
          results.resetPromiseExists = true;
        } else {
          results.resetPromiseExists = false;
        }
      } catch (err) {
        results.resetPromiseError = err.message;
      }

      return results;
    });

    console.log("Detailed state:", JSON.stringify(detailedState, null, 2));
    console.log("JS errors:", jsErrors);
    console.log("Console errors:", consoleErrors);
    console.log("Unhandled rejections:", unhandledRejections);

    // Check if there are specific errors related to orchestrator initialization
    const orchestratorErrors = [...jsErrors, ...consoleErrors].filter(
      (error) =>
        error.includes("orchestrator") ||
        error.includes("battleOrchestrator") ||
        error.includes("initClassicBattleOrchestrator") ||
        error.includes("resetGame")
    );

    if (orchestratorErrors.length > 0) {
      console.log("🎯 Orchestrator-specific errors found:");
      orchestratorErrors.forEach((error) => console.log("  -", error));
    } else {
      console.log("ℹ️ No orchestrator-specific errors detected");
    }

    // This test succeeds regardless - we're just gathering intel
    expect(true).toBe(true);
  });
});
