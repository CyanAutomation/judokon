import { test, expect } from "@playwright/test";

test.describe("CLI Layout Assessment - Desktop Focused", () => {
  test.beforeEach(async ({ page }) => {
    // Set standard desktop resolution for consistent testing
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/src/pages/battleCLI.html");
    await page.waitForSelector("#cli-root");
  });

  test("Desktop Layout - Basic Structure", async ({ page }) => {
    // Check basic container structure per PRD
    await expect(page.locator("#cli-root")).toBeVisible();
    await expect(page.locator("#cli-header")).toBeVisible();
    await expect(page.locator("#cli-countdown")).toBeVisible();
    await expect(page.locator("#cli-stats")).toBeVisible();
    await expect(page.locator("#round-message")).toBeVisible();

    // Header layout verification
    const header = page.locator("#cli-header");
    await expect(header).toHaveCSS("display", "flex");
    await expect(header).toHaveCSS("justify-content", "space-between");

    // Verify monospace font usage
    const bodyFontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(bodyFontFamily).toMatch(/monospace|Monaco|Consolas|Courier/);
  });

  test("Touch Target Requirements at Desktop", async ({ page }) => {
    // Check if stats are rendered
    const stats = page.locator(".cli-stat");
    const statCount = await stats.count();

    expect(statCount, "Expected at least one CLI stat to be rendered").toBeGreaterThan(0);

    // Test first stat row height
    const firstStat = stats.first();
    await expect(firstStat).toBeVisible();
    const statBox = await firstStat.boundingBox();
    expect(statBox, "Bounding box should be available once stat is visible").not.toBeNull();
    expect(statBox.height).toBeGreaterThanOrEqual(44);

    // Container should be visible and meet minimum height
    const statsContainer = page.locator("#cli-stats");
    await expect(statsContainer).toBeVisible();
    const containerBox = await statsContainer.boundingBox();
    expect(containerBox.height).toBeGreaterThanOrEqual(128); // 8rem minimum
  });

  test("Grid Layout Functionality", async ({ page }) => {
    const statsContainer = page.locator("#cli-stats");
    await expect(statsContainer).toHaveCSS("display", "grid");

    // Check that grid is functional at desktop resolution
    const isGridContainer = await statsContainer.evaluate((el) => {
      const style = getComputedStyle(el);
      return style.display === "grid";
    });
    expect(isGridContainer).toBe(true);
  });

  test("Desktop Color Contrast", async ({ page }) => {
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = getComputedStyle(body);
      return {
        background: computed.backgroundColor,
        color: computed.color
      };
    });

    // Allow for both standard and CLI immersive themes
    expect(bodyStyles.background).toMatch(/rgb\(11, 12, 12\)|#0b0c0c|rgb\(0, 0, 0\)|#000/);
    expect(bodyStyles.color).toMatch(/rgb\(242, 242, 242\)|#f2f2f2|rgb\(140, 255, 107\)|#8cff6b/);
  });
});
