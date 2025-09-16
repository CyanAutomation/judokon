import { test, expect } from "@playwright/test";

test.describe("Battle CLI - Start", () => {
  test("should load the page and start a match", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html?autostart=1");

    // After loading, the stats should be visible and not busy
    const statsContainer = page.locator("#cli-stats");
    await expect(statsContainer).toBeVisible();
    await expect(statsContainer).toHaveAttribute("aria-busy", "false", { timeout: 10000 });
  });
});
