import { test, expect } from "./fixtures/battleCliFixture.js";

const ALLOWED_CLI_BACKGROUND_COLORS = [
  "rgb(11,12,12)",
  "rgb(5,5,5)",
  "rgb(0,0,0)",
  "#0b0c0c",
  "#050505",
  "#000"
];

const ALLOWED_CLI_TEXT_COLORS = [
  "rgb(242,242,242)",
  "rgb(214,245,214)",
  "rgb(140,255,107)",
  "#f2f2f2",
  "#d6f5d6",
  "#8cff6b"
];

const normalizeColorValue = (colorValue) => colorValue.replace(/\s+/g, "").toLowerCase();

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
    await expect(async () => {
      const statBox = await firstStat.boundingBox();
      expect(statBox, "Bounding box should be available once stat is visible").not.toBeNull();
      expect(statBox.height).toBeGreaterThanOrEqual(44);
    }).toPass();

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

    // Allow for both standard and CLI immersive themes (normalize to avoid spacing/format drift)
    const normalizedBackground = normalizeColorValue(bodyStyles.background);
    const normalizedColor = normalizeColorValue(bodyStyles.color);

    expect(
      ALLOWED_CLI_BACKGROUND_COLORS.includes(normalizedBackground),
      `Unexpected CLI background color: ${bodyStyles.background} (normalized: ${normalizedBackground})`
    ).toBe(true);

    expect(
      ALLOWED_CLI_TEXT_COLORS.includes(normalizedColor),
      `Unexpected CLI text color: ${bodyStyles.color} (normalized: ${normalizedColor})`
    ).toBe(true);
  });
});
