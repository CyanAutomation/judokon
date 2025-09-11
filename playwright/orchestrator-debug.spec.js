import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";

test.describe("Battle Orchestrator Debug", () => {
  test("debug orchestrator initialization", async ({ page }) => withMutedConsole(async () => {
    // Capture console output and network requests
    const consoleMessages = [];
    const errors = [];
    const networkRequests = [];

    page.on("console", (msg) => {
      const text = msg.text();
      const type = msg.type();
      consoleMessages.push({ type, text });
      if (type === "error") {
        errors.push(text);
      }
    });

    page.on("pageerror", (err) => {
      errors.push(`Page Error: ${err.message}`);
    });

    // Capture network requests to identify the 404
    page.on("response", (response) => {
      networkRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    });

    // Set up localStorage and debugging
    await page.addInitScript(() => {
      localStorage.setItem("battle.pointsToWin", "5");
      window.__NEXT_ROUND_COOLDOWN_MS = 0;

      // Track module loading and initialization
      window.initDebug = {
        cliInitImported: false,
        cliInitExecuted: false,
        debugHooksImported: false,
        battleEventsImported: false,
        orchestratorImported: false,
        errors: []
      };

      // Hook into console to capture orchestrator errors
      const originalConsoleError = console.error;
      window.orchestratorErrors = [];
      console.error = (...args) => {
        const message = args.join(" ");
        window.orchestratorErrors.push(message);
        window.initDebug.errors.push(message);
        if (message.includes("Failed to initialize classic battle orchestrator")) {
          window.orchestratorInitFailed = true;
        }
        originalConsoleError.apply(console, args);
      };

      // Mock fetch to prevent 404 errors
      const originalFetch = window.fetch;
      window.fetch = (url, ...args) => {
        if (url && url.includes("statNames.json")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([{ id: 1, name: "Mock Stat", category: "Test", statIndex: 1 }])
          });
        }
        return originalFetch.apply(window, [url, ...args]);
      };
    });

    await page.goto("/src/pages/battleCLI.html");
    await page.waitForTimeout(5000);

    // Check orchestrator state
    const debugInfo = await page.evaluate(() => {
      const info = {
        battleState: document.body?.dataset?.battleState,
        hasStartButton: !!document.getElementById("start-match-button"),
        hasGetStateSnapshot: typeof window.getStateSnapshot === "function",
        hasBattleStore: typeof window.battleStore === "object",
        initDebug: window.initDebug || {},
        orchestratorErrors: window.orchestratorErrors || [],
        orchestratorInitFailed: window.orchestratorInitFailed || false,
        machineExists: false,
        machineState: null,
        stateSnapshot: null
      };

      try {
        if (typeof window.getStateSnapshot === "function") {
          info.stateSnapshot = window.getStateSnapshot();
        }
      } catch (err) {
        info.stateSnapshotError = err.message;
      }

      try {
        const getter = window.debugHooks?.readDebugState?.("getClassicBattleMachine");
        const machine = typeof getter === "function" ? getter() : getter;
        if (machine) {
          info.machineExists = true;
          info.machineState = typeof machine.getState === "function" ? machine.getState() : null;
        }
      } catch (err) {
        info.machineError = err.message;
      }

      return info;
    });

    console.log("=== DEBUG INFO ===");
    console.log(JSON.stringify(debugInfo, null, 2));

    console.log("\n=== CONSOLE MESSAGES ===");
    for (const msg of consoleMessages) {
      console.log(`[${msg.type}] ${msg.text}`);
    }

    console.log("\n=== NETWORK REQUESTS ===");
    const failedRequests = networkRequests.filter((req) => req.status >= 400);
    console.log("Failed requests:");
    for (const req of failedRequests) {
      console.log(`${req.status} ${req.statusText}: ${req.url}`);
    }

    console.log("\n=== ERRORS ===");
    for (const err of errors) {
      console.log(`ERROR: ${err}`);
    }

    // Manual orchestrator initialization test
    if (!debugInfo.machineExists) {
      console.log("\n=== ANALYZING ORCHESTRATOR ISSUES ===");

      // Check if we can access the orchestrator through the debug system
      const orchestratorAnalysis = await page.evaluate(() => {
        try {
          // Check the specific debug globals and what they actually contain
          const analysis = {
            hasDebugHooks: typeof window.debugHooks === "object",
            debugHooksKeys: window.debugHooks ? Object.keys(window.debugHooks) : [],
            hasBattleEvents: typeof window.emitBattleEvent === "function",
            hasCliInit: !!window.__battleCLIinit,
            cliInitKeys: window.__battleCLIinit ? Object.keys(window.__battleCLIinit) : [],
            // Check for any other global objects that might indicate module loading
            hasTest: typeof window.__test === "function",
            windowKeys: Object.keys(window).filter(
              (key) => key.startsWith("__") || key.includes("battle") || key.includes("debug")
            ),
            // Check the specific debug globals and their contents
            classicBattleDebugExpose: typeof window.__classicBattleDebugExpose,
            classicBattleDebugRead: typeof window.__classicBattleDebugRead,
            classicBattleEventTarget: typeof window.__classicBattleEventTarget,
            // Try to call these functions to see what they expose
            debugExposeResult:
              typeof window.__classicBattleDebugExpose === "function"
                ? (() => {
                    try {
                      return typeof window.__classicBattleDebugExpose();
                    } catch (e) {
                      return `Error: ${e.message}`;
                    }
                  })()
                : null,
            debugReadResult:
              typeof window.__classicBattleDebugRead === "function"
                ? (() => {
                    try {
                      const result = window.__classicBattleDebugRead();
                      return {
                        type: typeof result,
                        keys: result && typeof result === "object" ? Object.keys(result) : null
                      };
                    } catch (e) {
                      return `Error: ${e.message}`;
                    }
                  })()
                : null,
            eventTargetProps:
              typeof window.__classicBattleEventTarget === "object" &&
              window.__classicBattleEventTarget
                ? Object.getOwnPropertyNames(window.__classicBattleEventTarget)
                : null
          };

          return analysis;
        } catch (err) {
          return { error: err.message };
        }
      });

      console.log("Orchestrator analysis:", JSON.stringify(orchestratorAnalysis, null, 2));
    }

    expect(true).toBe(true);
  }, ["log", "warn", "error"]));
});