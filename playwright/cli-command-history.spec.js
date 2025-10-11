import { test, expect } from "@playwright/test";

test.describe("CLI Command History", () => {
  test("should show stat selection history", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");
    await page.waitForLoadState('domcontentloaded');

    // Manually start the battle
    await page.waitForFunction(() => window.testHooks, { timeout: 10000 });
    await page.evaluate(() => window.testHooks.startRound());

    // Wait for the battle to be ready for player action
    await page.waitForSelector('body[data-battle-state="waitingForPlayerAction"]', { timeout: 10000 });

    // Select stat '1'
    await page.keyboard.press("1");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("You Picked: Power");

    // Manually resolve the round for testing purposes
    await page.evaluate(() => window.testHooks.resolveRound());
    await page.waitForSelector('body[data-battle-state="roundOver"]');
    await page.keyboard.press("Enter"); // Continue to next round

    // Manually start the next round
    await page.evaluate(() => window.testHooks.startRound());

    // Wait for next round to be ready for player action
    await page.waitForSelector('body[data-battle-state="waitingForPlayerAction"]');

    // Select stat '2'
    await page.keyboard.press("2");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("You Picked: Speed");

    // Test history navigation
    await page.keyboard.press("Control+ArrowUp");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("History: speed");

    await page.keyboard.press("Control+ArrowUp");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("History: power");

    await page.keyboard.press("Control+ArrowDown");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("History: speed");

    await page.keyboard.press("Control+ArrowDown");
    await expect(page.locator("#snackbar-container .snackbar")).toHaveText("");
  });
});