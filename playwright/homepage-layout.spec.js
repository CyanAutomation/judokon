import { test, expect } from "@playwright/test";

test.describe("Homepage layout", () => {
  test.describe("desktop", () => {
    test.use({ viewport: { width: 1024, height: 800 } });

    test("grid has two columns", async ({ page }) => {
      await page.goto("/index.html");
      await page.waitForSelector(".game-mode-grid");
      const columnCount = await page.evaluate(() => {
        const style = getComputedStyle(document.querySelector(".game-mode-grid"));
        return style.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
      });
      expect(columnCount).toBe(2);
    });
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 500, height: 800 } });

    test("grid has one column", async ({ page }) => {
      await page.goto("/index.html");
      const columnCount = await page.evaluate(() => {
        const style = getComputedStyle(document.querySelector(".game-mode-grid"));
        return style.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
      });
      expect(columnCount).toBe(1);
    });
  });
});
