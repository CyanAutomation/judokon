import { test, expect } from "@playwright/test";

test.describe("Homepage layout", () => {
  test("desktop grid has two columns", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/index.html");
    await page.waitForSelector(".game-mode-grid");
    const columnCount = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector(".game-mode-grid"));
      return style.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
    });
    expect(columnCount).toBe(2);
  });

  test("mobile grid has one column", async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 });
    await page.goto("/index.html");
    const columnCount = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector(".game-mode-grid"));
      return style.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
    });
    expect(columnCount).toBe(1);
  });
});
