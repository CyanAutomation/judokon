import { test, expect } from "@playwright/test";

test.describe("Classic Battle page", () => {
  test("plays a full match and shows the end modal", async ({ page }) => {
    const logs = [];
    page.on("console", (msg) => {
      if (msg.type() === "log") {
        logs.push(msg.text());
      }
    });

    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        showRoundSelectModal: true
      };
    });

    await page.goto("/src/pages/battleClassic.html");

    // 1. Click the round select button for a quick match
    await page.locator('button:has-text("Quick")').click();

    // Play until the match ends
    for (let i = 0; i < 10; i++) {
      // Max 10 rounds to prevent infinite loop
      // 2. Wait for the stat buttons to be ready
      await page.waitForSelector('[data-buttons-ready="true"]');

      // 3. Click the first stat button
      await page.locator('[data-testid="stat-button"]').first().click();

      // 4. Wait for the next round button to be ready
      try {
        await page.waitForSelector('[data-next-ready="true"]', { timeout: 5000 });
      } catch (e) {
        // If the next button doesn't appear, the match might have ended
      }

      // Check if the end modal is visible
      const endModalVisible = await page.locator("#match-end-modal").isVisible();
      if (endModalVisible) {
        break;
      }

      // 5. Click the next round button if it's not disabled
      const nextButtonDisabled = await page.locator('[data-testid="next-button"]').isDisabled();
      if (!nextButtonDisabled) {
        await page.locator('[data-testid="next-button"]').click();
      }
    }

    // Assert that the end modal is visible
    await expect(page.locator("#match-end-modal")).toBeVisible();

    // Assert that the showEndModal function was called
    const showEndModalCalled = logs.some((log) => log.includes("showEndModal called with:"));
    expect(showEndModalCalled).toBe(true);
  });
});
