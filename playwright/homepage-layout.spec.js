import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Homepage layout", () => {
  test.describe("desktop", () => {
    test.use({ viewport: { width: 1024, height: 800 } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/index.html");
      await page.waitForSelector(".game-mode-grid");
      await page.waitForSelector("footer .bottom-navbar a");
    });

    test("grid has two columns", async ({ page }) => {
      const columnCount = await page.evaluate(() => {
        const style = getComputedStyle(document.querySelector(".game-mode-grid"));
        return style.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
      });
      expect(columnCount).toBe(2);
    });

    test("grid does not overlap footer", async ({ page }, testInfo) => {
      const gridBox = await page.locator(".game-mode-grid").boundingBox();
      const navBox = await page.locator(".bottom-navbar").boundingBox();

      expect(gridBox).not.toBeNull();
      expect(navBox).not.toBeNull();
      expect(gridBox.y + gridBox.height).toBeLessThanOrEqual(navBox.y);

      await page.screenshot({
        path: testInfo.outputPath("desktop-layout.png"),
        fullPage: true
      });
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

    test("grid does not overlap footer", async ({ page }, testInfo) => {
      await page.goto("/index.html");
      await page.waitForSelector("footer .bottom-navbar a");

      const gridBox = await page.locator(".game-mode-grid").boundingBox();
      const navBox = await page.locator(".bottom-navbar").boundingBox();

      expect(gridBox).not.toBeNull();
      expect(navBox).not.toBeNull();
      expect(gridBox.y + gridBox.height).toBeLessThanOrEqual(navBox.y);

      await page.screenshot({
        path: testInfo.outputPath("mobile-layout.png"),
        fullPage: true
      });
    });
  });
});
