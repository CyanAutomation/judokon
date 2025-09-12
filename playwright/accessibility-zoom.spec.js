import { test, expect } from "@playwright/test";

test.describe("Classic Battle CLI - 200% Zoom Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to simulate mobile-like dimensions at 200% zoom
    await page.setViewportSize({ width: 640, height: 800 });

    // Set zoom level to 200%
    await page.evaluate(() => {
      document.body.style.zoom = "2";
    });

    await page.goto("/src/pages/battleCLI.html");
    await page.waitForLoadState("networkidle");
  });

  test("CLI interface remains usable at 200% zoom", async ({ page }) => {
    // Verify main elements are visible and properly sized
    const header = page.locator("#cli-header");
    await expect(header).toBeVisible();

    const helpPanel = page.locator("#help-panel");
    const settingsPanel = page.locator("#settings-panel");

    // Verify help panel can be opened and text is readable
    await page.click('[data-testid="help-button"]');
    await expect(helpPanel).toBeVisible();

    // Check that help text doesn't overflow or become unreadable
    const helpContent = helpPanel.locator("p");
    await expect(helpContent.first()).toBeVisible();

    // Close help and open settings
    await page.keyboard.press("Escape");
    await expect(helpPanel).toBeHidden();

    await page.click('[data-testid="settings-button"]');
    await expect(settingsPanel).toBeVisible();

    // Verify settings controls are accessible at 200% zoom
    const winTargetSelect = page.locator("#win-target");
    await expect(winTargetSelect).toBeVisible();

    // Test that dropdowns work properly at high zoom
    await winTargetSelect.click();
    const option = page.locator('#win-target option[value="7"]');
    await expect(option).toBeVisible();

    await page.keyboard.press("Escape");
  });

  test("stat selection interface works at 200% zoom", async ({ page }) => {
    // Start a battle to access stat selection
    await page.click('[data-testid="start-battle-button"]');

    // Wait for stat list to load
    await page.waitForSelector("#cli-stats .stat-row", { timeout: 10000 });

    // Verify stat rows are visible and properly spaced
    const statRows = page.locator("#cli-stats .stat-row");
    const count = await statRows.count();
    expect(count).toBeGreaterThan(0);

    // Check that stat text is readable at 200% zoom
    const firstStat = statRows.first();
    await expect(firstStat).toBeVisible();

    // Verify stat selection works with keyboard
    await page.keyboard.press("1");

    // Check that round progression continues normally
    const roundMessage = page.locator("#round-message");
    await expect(roundMessage).toBeVisible();
  });

  test("modal dialogs are accessible at 200% zoom", async ({ page }) => {
    // Open quit confirmation dialog
    await page.keyboard.press("q");

    const quitDialog = page.locator('[role="dialog"]');
    await expect(quitDialog).toBeVisible();

    // Verify dialog content is readable and buttons are accessible
    const confirmButton = quitDialog.locator("button");
    await expect(confirmButton).toBeVisible();

    // Test that ESC key still works to close
    await page.keyboard.press("Escape");
    await expect(quitDialog).toBeHidden();
  });

  test("settings match length selection works at 200% zoom", async ({ page }) => {
    // Open settings
    await page.click('[data-testid="settings-button"]');

    // Test round selection modal at 200% zoom
    const roundSelect = page.locator('[data-testid="round-select-button"]');
    await expect(roundSelect).toBeVisible();

    await roundSelect.click();

    // Verify modal appears and is usable at high zoom
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Test keyboard navigation in modal
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    // Verify modal closes and settings update
    await expect(modal).toBeHidden();

    await page.keyboard.press("Escape"); // Close settings
  });
});
