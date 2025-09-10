import { test } from "@playwright/test";

test("debug battle state progression", async ({ page }) => {
  // Capture events and state changes
  const stateChanges = [];
  const errors = [];

  page.on("pageerror", (error) => {
    errors.push(`Page Error: ${error.message}`);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`Console Error: ${msg.text()}`);
    }
    if (msg.text().includes("State transition") || msg.text().includes("battleStateChange")) {
      console.log(`[BATTLE STATE] ${msg.text()}`);
    }
  });

  // Load the page with autostart=1 (proper parameter)
  await page.goto("/src/pages/battleCLI.html?autostart=1");

  // Set up listener for battle state changes
  await page.evaluate(() => {
    window.stateChanges = [];
    if (window.onBattleEvent) {
      window.onBattleEvent("battleStateChange", (e) => {
        const detail = e.detail || {};
        window.stateChanges.push({
          from: detail.from,
          to: detail.to,
          event: detail.event,
          timestamp: Date.now()
        });
        console.log(`[STATE CHANGE] ${detail.from} → ${detail.to} (${detail.event})`);
      });
    }
  });

  // Wait for initial state
  await page.waitForTimeout(2000);

  let currentState = await page.evaluate(() => document.body?.dataset?.battleState);
  console.log(`Initial state: ${currentState}`);

  // Try to trigger battle start if not already started
  if (currentState === "waitingForMatchStart") {
    console.log("Battle is in waitingForMatchStart, trying to start...");

    // Check if start button exists and click it
    const startBtn = page.locator("#start-match-button");
    if (await startBtn.isVisible()) {
      console.log("Start button found, clicking...");
      await startBtn.click();
    } else {
      // Try using the safeDispatch if available
      await page.evaluate(() => {
        if (typeof window.safeDispatch === "function") {
          console.log('[DEBUG] Calling safeDispatch("startClicked")');
          window.safeDispatch("startClicked");
        } else {
          console.log("[DEBUG] safeDispatch not available");
        }
      });
    }

    // Wait for state to change
    await page.waitForTimeout(3000);
    currentState = await page.evaluate(() => document.body?.dataset?.battleState);
    console.log(`State after start attempt: ${currentState}`);
  }

  // Wait longer to see if cooldown progresses to the next state
  if (currentState === "cooldown") {
    console.log("Battle is in cooldown, waiting for progression...");
    await page.waitForTimeout(5000);
    currentState = await page.evaluate(() => document.body?.dataset?.battleState);
    console.log(`State after cooldown wait: ${currentState}`);
  }

  // Get detailed battle state info
  const battleInfo = await page.evaluate(() => {
    const store = window.battleStore;
    const snapshot = window.getStateSnapshot ? window.getStateSnapshot() : null;

    return {
      currentState: document.body?.dataset?.battleState,
      storeExists: !!store,
      storeEngine: store?.engine ? "exists" : "missing",
      storeOrchestrator: store?.orchestrator ? "exists" : "missing",
      stateSnapshot: snapshot,
      stateChanges: window.stateChanges || [],
      roundSelectModalVisible: !!document.querySelector('[data-modal="roundSelect"]'),
      startButtonVisible: !!document.querySelector("#start-match-button"),
      battleReadyPromise: !!window.battleReadyPromise
    };
  });

  console.log("\n=== BATTLE INFO ===");
  console.log(JSON.stringify(battleInfo, null, 2));

  if (errors.length > 0) {
    console.log("\n=== ERRORS ===");
    for (const error of errors) {
      console.log(error);
    }
  }
});
