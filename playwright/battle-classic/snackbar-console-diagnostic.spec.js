import { test, expect } from "../fixtures/commonSetup.js";

test.describe("Snackbar console diagnostic (NO MUTING)", () => {
  test("capture all console logs to diagnose handler execution", async ({ page }) => {
    // Capture ALL console output
    const consoleLogs = [];
    page.on("console", (msg) => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text });
      // Also log to test output
      console.log(`[PAGE ${msg.type()}] ${text}`);
    });

    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Start the match via modal
    console.log("\n========== CLICKING MEDIUM BUTTON ==========");
    await expect(page.getByRole("button", { name: "Medium" })).toBeVisible();
    await page.getByRole("button", { name: "Medium" }).click();

    console.log("\n========== WAITING FOR STAT BUTTONS ==========");
    const container = page.getByTestId("stat-buttons");
    await expect(container).toHaveAttribute("data-buttons-ready", "true");

    console.log("\n========== BEFORE CLICKING STAT BUTTON ==========");
    await page.waitForTimeout(100); // Let any pending operations complete

    console.log("\n========== CLICKING STAT BUTTON ==========");
    const buttons = page.getByTestId("stat-button");
    await buttons.first().click();

    console.log("\n========== AFTER CLICKING STAT BUTTON ==========");
    await page.waitForTimeout(1000); // Give time for handlers to execute

    // Check snackbar state
    const snackbarState = await page.evaluate(() => {
      return {
        snackbarExists: !!document.querySelector(".snackbar"),
        snackbarContent: document.querySelector(".snackbar")?.textContent || null,
        statSelected: document.body.getAttribute("data-stat-selected")
      };
    });

    console.log("\n========== FINAL STATE ==========");
    console.log("Snackbar exists:", snackbarState.snackbarExists);
    console.log("Snackbar content:", snackbarState.snackbarContent);
    console.log("Stat selected:", snackbarState.statSelected);

    console.log("\n========== CONSOLE LOGS SUMMARY ==========");
    const handlerLogs = consoleLogs.filter(
      (log) =>
        log.text.includes("[Handler Registration]") ||
        log.text.includes("[statSelected Handler]") ||
        log.text.includes("[displayOpponentChoosingPrompt]") ||
        log.text.includes("[EventTarget]") ||
        log.text.includes("[roundSelectModal]")
    );

    handlerLogs.forEach((log) => {
      console.log(`  ${log.type}: ${log.text}`);
    });

    // Verify stat selection happened
    expect(snackbarState.statSelected).toBe("true");

    // Report findings
    console.log("\n========== ANALYSIS ==========");
    if (handlerLogs.filter((l) => l.text.includes("[statSelected Handler]")).length === 0) {
      console.log("❌ statSelected handler was NEVER CALLED - Event not received!");
    } else {
      console.log("✅ statSelected handler was called");
    }

    if (
      handlerLogs.filter((l) => l.text.includes("[Handler Registration] PROCEEDING")).length === 0
    ) {
      console.log("❌ Handlers were NEVER REGISTERED - WeakSet blocked or error occurred!");
    } else {
      console.log("✅ Handlers were registered");
    }

    if (
      handlerLogs.filter((l) => l.text.includes("[displayOpponentChoosingPrompt]")).length === 0
    ) {
      console.log("❌ displayOpponentChoosingPrompt was NEVER CALLED");
    } else {
      console.log("✅ displayOpponentChoosingPrompt was called");
    }
  });
});
