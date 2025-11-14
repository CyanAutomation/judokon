import { test, expect } from "./fixtures/battleCliFixture.js";
import { configureApp } from "./fixtures/appConfig.js";

test.describe("Round Select Modal - Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    const app = await configureApp(page, {
      testMode: "disable",
      requireRoundSelectModal: true
    });

    await page.goto("/src/pages/battleCLI.html");
    await app.applyRuntime();
    await page.waitForSelector("dialog.modal", { state: "visible", timeout: 10000 });
  });

  test("should show keyboard instructions in modal", async ({ page }) => {
    const instructions = page.locator(".round-select-instructions");
    await expect(instructions).toBeVisible();
    await expect(instructions).toContainText("Use number keys (1-3) or arrow keys to select");
  });

  test("should select Quick with number key 1", async ({ page }) => {
    await page.keyboard.press("1");

    // Wait for the modal to close and stats to appear
    await page.waitForSelector("dialog.modal", { state: "hidden" });
    await page.waitForSelector("#cli-stats", { state: "visible" });

    // Check that Quick mode was selected (3 points to win)
    const header = page.locator("#cli-header");
    await expect(header).toContainText("Round 1 Target: 3");
  });

  test("should select Medium with number key 2", async ({ page }) => {
    await page.keyboard.press("2");

    // Wait for the modal to close and stats to appear
    await page.waitForSelector("dialog.modal", { state: "hidden" });
    await page.waitForSelector("#cli-stats", { state: "visible" });

    // Check that Medium mode was selected (5 points to win)
    const header = page.locator("#cli-header");
    await expect(header).toContainText("Round 1 Target: 5");
  });

  test("should select Long with number key 3", async ({ page }) => {
    await page.keyboard.press("3");

    // Wait for the modal to close and stats to appear
    await page.waitForSelector("dialog.modal", { state: "hidden" });
    await page.waitForSelector("#cli-stats", { state: "visible" });

    // Check that Long mode was selected (10 points to win)
    const header = page.locator("#cli-header");
    await expect(header).toContainText("Round 1 Target: 10");
  });

  test("should navigate with arrow keys and select with Enter", async ({ page }) => {
    // Focus should initially be on the first button (Quick)
    let focusedButton = page.locator("button:focus");
    await expect(focusedButton).toContainText("Quick");

    // Press Down arrow to move to Medium
    await page.keyboard.press("ArrowDown");
    focusedButton = page.locator("button:focus");
    await expect(focusedButton).toContainText("Medium");

    // Press Down arrow to move to Long
    await page.keyboard.press("ArrowDown");
    focusedButton = page.locator("button:focus");
    await expect(focusedButton).toContainText("Long");

    // Press Down arrow to wrap back to Quick
    await page.keyboard.press("ArrowDown");
    focusedButton = page.locator("button:focus");
    await expect(focusedButton).toContainText("Quick");

    // Press Up arrow to go to Long
    await page.keyboard.press("ArrowUp");
    focusedButton = page.locator("button:focus");
    await expect(focusedButton).toContainText("Long");

    // Press Enter to select Long
    await page.keyboard.press("Enter");

    // Wait for the modal to close and stats to appear
    await page.waitForSelector("dialog.modal", { state: "hidden" });
    await page.waitForSelector("#cli-stats", { state: "visible" });

    // Check that Long mode was selected (10 points to win)
    const header = page.locator("#cli-header");
    await expect(header).toContainText("Round 1 Target: 10");
  });

  test("should handle Up arrow wrapping", async ({ page }) => {
    // Focus should initially be on the first button (Quick)
    let focusedButton = page.locator("button:focus");
    await expect(focusedButton).toContainText("Quick");

    // Press Up arrow from first button to wrap to last button (Long)
    await page.keyboard.press("ArrowUp");
    focusedButton = page.locator("button:focus");
    await expect(focusedButton).toContainText("Long");
  });
});
