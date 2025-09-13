import { test, expect } from "@playwright/test";

test.describe("Round Selection - Win Target Synchronization", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to force the round select modal to appear
    await page.addInitScript(() => {
      localStorage.clear();
      // Ensure the modal shows in test environment
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      // Prevent auto-start conditions
      delete window.location.search;
      // Disable test mode that would skip modal
      window.__TEST_MODE_ENABLED = false;
    });

    await page.goto("/src/pages/battleCLI.html");
    await page.waitForSelector(".modal-backdrop", { state: "visible", timeout: 10000 });
  });

  test("should sync win target dropdown when Quick is selected", async ({ page }) => {
    // Select Quick (5 points) from the modal
    await page.keyboard.press("1");

    // Wait for the modal to close and game to start
    await page.waitForSelector(".modal-backdrop", { state: "hidden" });
    await page.waitForSelector("#cli-stats", { state: "visible" });

    // Wait a bit for the battle to fully initialize
    await page.waitForTimeout(500);

    // Verify settings toggle exists before clicking
    const settingsButton = page.locator("#cli-settings-toggle");
    await expect(settingsButton).toBeVisible();

    // Check if settings panel is already open
    const settingsBody = page.locator("#cli-settings-body");
    const isVisible = await settingsBody.isVisible();

    if (!isVisible) {
      // Open settings panel
      await settingsButton.click();
      await page.waitForSelector("#cli-settings-body", { state: "visible" });
    }

    // Check that the win target dropdown shows 5
    const dropdown = page.locator("#points-select");
    await expect(dropdown).toHaveValue("5");

    // Verify the header also shows the correct target
    const header = page.locator("#cli-header");
    await expect(header).toContainText("Target:5");
  });

  test("should sync win target dropdown when Medium is selected", async ({ page }) => {
    // Select Medium (10 points) from the modal
    await page.keyboard.press("2");

    // Wait for the modal to close and game to start
    await page.waitForSelector(".modal-backdrop", { state: "hidden" });
    await page.waitForSelector("#cli-stats", { state: "visible" });

    // Wait a bit for the battle to fully initialize
    await page.waitForTimeout(500);

    // Verify settings toggle exists before clicking
    const settingsButton = page.locator("#cli-settings-toggle");
    await expect(settingsButton).toBeVisible();

    // Check if settings panel is already open
    const settingsBody = page.locator("#cli-settings-body");
    const isVisible = await settingsBody.isVisible();

    if (!isVisible) {
      // Open settings panel
      await settingsButton.click();
      await page.waitForSelector("#cli-settings-body", { state: "visible" });
    }

    // Check that the win target dropdown shows 10
    const dropdown = page.locator("#points-select");
    await expect(dropdown).toHaveValue("10");

    // Verify the header also shows the correct target
    const header = page.locator("#cli-header");
    await expect(header).toContainText("Target: 10");
  });

  test("should sync win target dropdown when Long is selected", async ({ page }) => {
    // Select Long (15 points) from the modal
    await page.keyboard.press("3");

    // Wait for the modal to close and game to start
    await page.waitForSelector(".modal-backdrop", { state: "hidden" });
    await page.waitForSelector("#cli-stats", { state: "visible" });

    // Wait a bit for the battle to fully initialize
    await page.waitForTimeout(500);

    // Verify settings toggle exists before clicking
    const settingsButton = page.locator("#cli-settings-toggle");
    await expect(settingsButton).toBeVisible();

    // Check if settings panel is already open
    const settingsBody = page.locator("#cli-settings-body");
    const isVisible = await settingsBody.isVisible();

    if (!isVisible) {
      // Open settings panel
      await settingsButton.click();
      await page.waitForSelector("#cli-settings-body", { state: "visible" });
    }

    // Check that the win target dropdown shows 15
    const dropdown = page.locator("#points-select");
    await expect(dropdown).toHaveValue("15");

    // Verify the header also shows the correct target
    const header = page.locator("#cli-header");
    await expect(header).toContainText("Target:15");
  });

  test("should maintain synchronization from modal to settings dropdown", async ({ page }) => {
    // Start with Quick (5 points)
    await page.keyboard.press("1");
    await page.waitForSelector(".modal-backdrop", { state: "hidden" });
    await page.waitForSelector("#cli-stats", { state: "visible" });

    // Wait a bit for the battle to fully initialize
    await page.waitForTimeout(500);

    // Verify settings toggle exists before clicking
    const settingsButton = page.locator("#cli-settings-toggle");
    await expect(settingsButton).toBeVisible();

    // Check if settings panel is already open
    const settingsBody = page.locator("#cli-settings-body");
    const isVisible = await settingsBody.isVisible();

    if (!isVisible) {
      // Open settings panel
      await settingsButton.click();
      await page.waitForSelector("#cli-settings-body", { state: "visible" });
    }

    // Verify initial state is 5
    const dropdown = page.locator("#points-select");
    await expect(dropdown).toHaveValue("5");

    // Verify the header shows Target:5 initially
    const header = page.locator("#cli-header");
    await expect(header).toContainText("Target:5");

    // This test validates that the synchronization worked from modal to dropdown
    // The dropdown shows 5, which proves our sync function is working correctly
  });
});

