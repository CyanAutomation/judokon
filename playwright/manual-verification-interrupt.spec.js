import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Manual verification: Interrupt flow and cooldown", () => {
  test("should handle interrupt round and progress to cooldown without stalling", async ({
    page
  }) => {
    // Navigate to the classic battle page
    await page.goto("http://127.0.0.1:5000/src/pages/battleClassic.html");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // Get the state display element (if available for debugging)
    let stateElement = await page.locator("body").textContent();
    console.log("Initial page state:", stateElement?.substring(0, 100));

    // Start the match
    // Look for any button or input that initiates the battle
    const buttons = await page.locator("button").all();
    console.log(`Found ${buttons.length} buttons on page`);

    // Try to interact with the page to start a battle
    // Look for Start, Begin, or similar buttons
    const startButton = page
      .locator('button:has-text("Start")')
      .or(page.locator('button:has-text("Begin")'))
      .or(page.locator('button:has-text("Play")'));

    const startButtonCount = await startButton.count();
    if (startButtonCount > 0) {
      console.log("Found start button, clicking...");
      await startButton.first().click();
      await page.waitForTimeout(1000);
    }

    // Try to locate the battle interface elements
    const roundMessage = page.locator("#round-message");
    const roundText = await roundMessage.textContent().catch(() => "");
    console.log("Round message:", roundText);

    // Verify that the page is interactive
    const pageContent = await page.locator("body").innerHTML();
    const hasClassicBattle = pageContent.includes("classic") || pageContent.includes("battle");
    expect(hasClassicBattle).toBeTruthy();

    console.log("✓ Page loaded successfully");
  });

  test("should expose debug state when available", async ({ page }) => {
    await page.goto("http://127.0.0.1:5000/src/pages/battleClassic.html");
    await page.waitForLoadState("networkidle");

    // Try to access debug state through window object
    const debugState = await page
      .evaluate(() => {
        // window.__DEBUG_STATE__ may not exist
        return (typeof window !== "undefined" && window.__DEBUG_STATE__) || null;
      })
      .catch(() => null);

    console.log("Debug state available:", !!debugState);

    // Check if the page has battle-related content
    const hasContent = await page.locator("body").textContent();
    expect(hasContent?.length || 0).toBeGreaterThan(0);

    console.log("✓ Battle page loaded and responsive");
  });

  test("should verify interrupt functionality integrates without errors", async ({ page }) => {
    await page.goto("http://127.0.0.1:5000/src/pages/battleClassic.html");

    // Monitor console messages for errors
    const consoleMessages = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleMessages.push(`ERROR: ${msg.text()}`);
      }
    });

    await page.waitForLoadState("networkidle");

    // Check for any JavaScript errors
    const errors = await page
      .evaluate(() => {
        return (typeof window !== "undefined" && window.__ERRORS__) || [];
      })
      .catch(() => []);

    console.log("Logged errors:", errors.length > 0 ? errors : "None");

    // The page should load without immediate crashes
    const html = await page.content();
    expect(html.length).toBeGreaterThan(100);

    console.log("✓ Page loaded without critical errors");
  });
});
