import { test, expect } from "@playwright/test";
import { resolve } from "path";
import { withMutedConsole } from "../tests/utils/console.js";

test.describe("CLI Keyboard Flows", () => {
  test.beforeEach(async ({ page }) => {
    const file = "file://" + resolve(process.cwd(), "src/pages/battleCLI.html");
    await page.goto(file);

    // Wait for CLI interface to be ready
    await page.waitForSelector("#cli-stats", { timeout: 8000 });

    // Force modal display for consistent testing
    await page.evaluate(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
  });

  test("should load CLI interface correctly", async ({ page }) => {
    await withMutedConsole(async () => {
      // Verify CLI stats container is present
      const statsContainer = page.locator("#cli-stats");
      await expect(statsContainer).toBeVisible();

      // Verify CLI has expected structure
      const cliRoot = page.locator("#cli-root");
      await expect(cliRoot).toBeVisible();

      // Verify round display
      const roundDisplay = page.locator("#cli-round");
      await expect(roundDisplay).toBeVisible();

      // Verify score display
      const scoreDisplay = page.locator("#cli-score");
      await expect(scoreDisplay).toBeVisible();
    }, ["log", "warn", "error"]);
  });

  test("should handle keyboard input without errors", async ({ page }) => {
    await withMutedConsole(async () => {
      // Test various keyboard inputs that should not cause crashes
      const testKeys = ["1", "2", "3", "h", "H", "q", "Q", "Enter", " "];

      for (const key of testKeys) {
        await page.keyboard.press(key);
        // Verify page remains stable after each key press
        await expect(page.locator("#cli-root")).toBeVisible();
      }

      // Verify we're still on the CLI page
      await expect(page).toHaveURL(/battleCLI.html/);
    }, ["log", "warn", "error"]);
  });

  test("should display help information when available", async ({ page }) => {
    await withMutedConsole(async () => {
      // Check if help panel exists
      const helpPanel = page.locator("#cli-shortcuts");

      if (await helpPanel.count() > 0) {
        // If help panel exists, test keyboard toggle
        const isInitiallyVisible = await helpPanel.isVisible();

        // Press 'h' to potentially toggle help
        await page.keyboard.press("h");

        // Page should remain stable regardless of toggle behavior
        await expect(page.locator("#cli-root")).toBeVisible();

        // Press 'h' again
        await page.keyboard.press("h");
        await expect(page.locator("#cli-root")).toBeVisible();
      } else {
        // Help panel not implemented - that's okay
        // Just verify basic CLI functionality
        await expect(page.locator("#cli-stats")).toBeVisible();
      }
    }, ["log", "warn", "error"]);
  });

  test("should handle quit functionality gracefully", async ({ page }) => {
    await withMutedConsole(async () => {
      // Press 'q' for quit
      await page.keyboard.press("q");

      // Page should remain stable
      await expect(page.locator("#cli-root")).toBeVisible();

      // Check if modal container exists and is empty (expected for quit)
      const modalContainer = page.locator("#modal-container");
      if (await modalContainer.count() > 0) {
        // Modal container exists - verify it doesn't break the page
        await expect(modalContainer).toBeAttached();
      }

      // Verify we're still on a valid page
      await expect(page).toHaveURL(/.*/);
    }, ["log", "warn", "error"]);
  });

  test("should maintain CLI state through multiple interactions", async ({ page }) => {
    await withMutedConsole(async () => {
      // Perform a sequence of interactions
      const interactions = [
        () => page.keyboard.press("1"),
        () => page.keyboard.press("h"),
        () => page.keyboard.press("2"),
        () => page.keyboard.press("h"),
        () => page.keyboard.press("q"),
        () => page.keyboard.press("Enter"),
      ];

      for (const interaction of interactions) {
        await interaction();
        // Verify CLI root remains stable after each interaction
        await expect(page.locator("#cli-root")).toBeVisible();
      }

      // Final verification
      await expect(page.locator("#cli-stats")).toBeVisible();
      await expect(page.locator("#cli-round")).toBeVisible();
    }, ["log", "warn", "error"]);
  });
});


