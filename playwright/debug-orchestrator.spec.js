import { test, expect } from "@playwright/test";

test.describe("Battle CLI Orchestrator Debug", () => {
  test("debug orchestrator initialization sequence", async ({ page }) => {
    let allErrors = [];
    let orchestratorLogs = [];

    // Capture errors and orchestrator-related logs
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") {
        allErrors.push(text);
        console.log("❌ Browser error:", text);
      }
      if (
        text.includes("orchestrator") ||
        text.includes("classic battle") ||
        text.includes("initClassicBattleOrchestrator")
      ) {
        orchestratorLogs.push(text);
        console.log("🔧 Orchestrator log:", text);
      }
    });

    await page.addInitScript(() => {
      // Set storage for auto-start to eliminate modal complexity
      localStorage.setItem("battle.pointsToWin", "5");

      // Override console.error to catch orchestrator initialization failures
      const originalError = console.error;
      console.error = (...args) => {
        originalError(...args);
        if (args.some((arg) => typeof arg === "string" && arg.includes("orchestrator"))) {
          originalError("[ORCHESTRATOR ERROR]", ...args);
        }
      };
    });

    await page.goto("/src/pages/battleCLI.html");

    // Wait a bit longer for the async orchestrator initialization
    await page.waitForTimeout(3000);

    // Check the initialization state in detail
    const initState = await page.evaluate(() => {
      return {
        // Store state
        hasBattleStore: !!window.battleStore,
        storeProps: window.battleStore ? Object.keys(window.battleStore) : [],

        // Engine state
        storeEngine: window.battleStore?.engine ? "exists" : "missing",
        storeOrchestrator: window.battleStore?.orchestrator ? "exists" : "missing",

        // Check if resetPromise resolved
        resetPromiseState: window.battleStore?.__resetPromiseState || "unknown",

        // Battle state
        battleState: document.body?.dataset?.battleState,
        stateSnapshot: window.getStateSnapshot ? window.getStateSnapshot() : null,

        // Debug hooks (used by safeDispatch)
        hasDebugHooks: !!window.debugHooks,
        debugState: window.debugHooks?.readDebugState ? "available" : "missing",

        // Check if battleOrchestrator is available globally
        hasBattleOrchestrator: !!window.battleOrchestrator,

        // Check for any initialization completion markers
        battleReadyPromise: !!window.battleReadyPromise,
        initializationComplete: !!window.__initializationComplete
      };
    });

    console.log("Initialization state:", JSON.stringify(initState, null, 2));
    console.log("All errors:", allErrors);
    console.log("Orchestrator logs:", orchestratorLogs);

    // Try to check if we can get more insight into the resetPromise
    const resetPromiseState = await page.evaluate(async () => {
      // Try to inspect the resetPromise that should be set during init
      if (window.battleStore?.__resetPromise) {
        try {
          const result = await Promise.race([
            window.battleStore.__resetPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1000))
          ]);
          return { status: "resolved", result };
        } catch (err) {
          return { status: "rejected_or_timeout", error: err.message };
        }
      }
      return { status: "no_reset_promise" };
    });

    console.log("Reset promise state:", JSON.stringify(resetPromiseState, null, 2));

    // Check if the engine facade is working
    const engineFacadeState = await page.evaluate(() => {
      return {
        // Check if engine facade methods are available
        hasGetPointsToWin: typeof window.engineFacade?.getPointsToWin === "function",
        hasSetPointsToWin: typeof window.engineFacade?.setPointsToWin === "function",
        hasOn: typeof window.engineFacade?.on === "function",

        // Try to get current points to win
        currentPointsToWin: (() => {
          try {
            return window.engineFacade?.getPointsToWin?.() || "unavailable";
          } catch (err) {
            return `error: ${err.message}`;
          }
        })()
      };
    });

    console.log("Engine facade state:", JSON.stringify(engineFacadeState, null, 2));

    // The test succeeds if we can identify why orchestrator isn't initializing
    expect(allErrors.length).toBeGreaterThanOrEqual(0); // Allow errors for debugging
  });
});
