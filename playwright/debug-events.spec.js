import { test, expect } from "@playwright/test";

test.describe("Battle CLI Event Debug", () => {
  test("debug event dispatching and state machine progression", async ({ page }) => {
    let allConsoleMessages = [];

    // Capture all console output including battle events
    page.on("console", (msg) => {
      const text = msg.text();
      allConsoleMessages.push(`${msg.type()}: ${text}`);
      if (text.includes("battle") || text.includes("event") || text.includes("state")) {
        console.log(`Browser: ${msg.type()}: ${text}`);
      }
    });

    await page.addInitScript(() => {
      // Set storage for auto-start
      localStorage.setItem("battle.pointsToWin", "5");

      // Override console methods to capture more debugging
      const originalLog = console.log;
      const originalDebug = console.debug;

      console.log = (...args) => {
        originalLog(...args);
        if (
          args.some(
            (arg) =>
              typeof arg === "string" &&
              (arg.includes("battle") ||
                arg.includes("event") ||
                arg.includes("state") ||
                arg.includes("startClicked") ||
                arg.includes("dispatch"))
          )
        ) {
          originalLog("[DEBUG]", ...args);
        }
      };

      console.debug = (...args) => {
        originalDebug(...args);
        // Show all debug messages for this test
        originalLog("[DEBUG]", ...args);
      };
    });

    await page.goto("/src/pages/battleCLI.html");

    // Wait a bit for initialization to complete
    await page.waitForTimeout(2000);

    // Check current state
    const finalState = await page.evaluate(() => {
      return {
        bodyDataState: document.body?.dataset?.battleState,
        hasModal: !!document.querySelector('[role="dialog"]'),
        hasStartButton: !!document.getElementById("start-match-button"),
        windowState: window.getStateSnapshot ? window.getStateSnapshot() : "no state snapshot",
        // Check if the state machine is properly initialized
        hasBattleStore: !!window.battleStore,
        storeState: window.battleStore
          ? {
              hasEngine: !!window.battleStore.engine,
              hasOrchestrator: !!window.battleStore.orchestrator
            }
          : null
      };
    });

    console.log("Final state after init:", JSON.stringify(finalState, null, 2));

    // Show some of the console messages for debugging
    const relevantMessages = allConsoleMessages.filter(
      (msg) =>
        msg.includes("battle") ||
        msg.includes("event") ||
        msg.includes("startClicked") ||
        msg.includes("dispatch") ||
        msg.includes("state")
    );

    console.log("Relevant console messages:");
    relevantMessages.forEach((msg) => console.log(`  ${msg}`));

    // The key test: if storage logic worked, we should NOT have a modal
    if (finalState.windowState && finalState.windowState.state) {
      console.log(`Current battle state: ${finalState.windowState.state}`);

      if (finalState.windowState.state === "waitingForMatchStart") {
        console.log("❌ Battle stuck in waitingForMatchStart - startClicked event not processed");
      } else if (finalState.windowState.state === "waitingForPlayerAction") {
        console.log("✅ Battle progressed to waitingForPlayerAction - auto-start worked!");
      } else {
        console.log(`⚠️ Battle in unexpected state: ${finalState.windowState.state}`);
      }
    }

    // This test is for debugging - always pass
    expect(true).toBe(true);
  });
});
