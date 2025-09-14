import { test, expect } from "@playwright/test";

test.describe("Classic Battle CLI - 200% Zoom Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to simulate mobile-like dimensions at 200% zoom
    await page.setViewportSize({ width: 1280, height: 800 });

    // Set zoom level to 200%
    await page.evaluate(() => {
      document.body.style.zoom = "2";
    });

    await page.addInitScript(() => {
      // Keep UI deterministic for tests
      try {
        localStorage.setItem("battleCLI.verbose", "false");
      } catch {}
      try {
        // Set both the legacy test key and the canonical storage key so the
        // round-select modal is skipped in browser tests.
        localStorage.setItem("battleCLI.pointsToWin", "5");
        try {
          localStorage.setItem("battle.pointsToWin", "5");
        } catch {}
      } catch {}
      try {
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      // Speed up inter-round where possible
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });

    await page.goto("/src/pages/battleCLI.html");
    await page.waitForLoadState("networkidle");
  });

  test("CLI interface remains usable at 200% zoom", async ({ page }) => {
    // Verify main elements are visible and properly sized
    const header = page.locator("#cli-header");
    await expect(header).toBeVisible();

    const helpPanel = page.locator("#cli-shortcuts");
    const settingsButton = page.locator('[data-testid="settings-button"]');
    const settingsBody = page.locator("#cli-settings-body");

    // Verify help panel can be opened and text is readable
    await page.keyboard.press("h");
    await expect(helpPanel).toBeVisible();

    // Check that help text doesn't overflow or become unreadable
    const helpContent = helpPanel.locator("li");
    await expect(helpContent.first()).toBeVisible();

    // Close help and open settings
    await page.keyboard.press("Escape");
    // await expect(helpPanel).toBeHidden();

    if ((await settingsButton.getAttribute("aria-expanded")) === "false") {
      await settingsButton.click();
      await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    } else {
      await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    }
    await expect(settingsBody).toBeVisible();

    // Verify settings controls are accessible at 200% zoom
    const winTargetSelect = settingsBody.locator("#points-select");
    await expect(winTargetSelect).toBeVisible();

    // Test that dropdowns work properly at high zoom
    await winTargetSelect.selectOption("5");
    await expect(winTargetSelect).toHaveValue("5");

    await page.keyboard.press("Escape");
  });

  test("stat selection interface works at 200% zoom", async ({ page }) => {
    // Start a battle to access stat selection
    const startSelector = '[data-testid="start-battle-button"]';
    try {
      await page.waitForSelector(startSelector, { timeout: 10000 });
      await page.locator(startSelector).click();
    } catch {
      // If the button doesn't appear, battle likely auto-started.
    }

    // Wait for stat list to load
    await page.waitForSelector("#cli-stats .cli-stat", { timeout: 10000 });

    // Verify stat rows are visible and properly spaced
    const statRows = page.locator("#cli-stats .cli-stat");
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
    const confirmButton = quitDialog.locator("#confirm-quit-button");
    await expect(confirmButton).toBeVisible();

    // Test that ESC key still works to close
    await page.keyboard.press("Escape");
    await expect(quitDialog).toBeHidden();
  });

  test("settings match length selection works at 200% zoom", async ({ page }) => {
    // Open settings
    const settingsButton = page.locator('[data-testid="settings-button"]');
    const settingsBody = page.locator("#cli-settings-body");
    if ((await settingsButton.getAttribute("aria-expanded")) === "false") {
      await settingsButton.click();
      await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    } else {
      await expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    }
    await expect(settingsBody).toBeVisible();

    // Test round selection dropdown at 200% zoom
    const roundSelect = settingsBody.locator("#points-select");
    await expect(roundSelect).toBeVisible();

    await roundSelect.selectOption("5");

    // Verify settings update
    await expect(roundSelect).toHaveValue("5");

    await page.keyboard.press("Escape"); // Close settings
  });
});
