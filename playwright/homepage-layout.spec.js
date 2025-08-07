import { test, expect } from "./fixtures/commonSetup.js";

const ALLOWED_OFFSET = 2;

test.describe.parallel("Homepage layout", () => {
  test.describe.parallel("desktop", () => {
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
      const grid = page.locator(".game-mode-grid");
      const gridBox = await grid.boundingBox();
      const navBox = await page.locator(".bottom-navbar").boundingBox();

      expect(gridBox).not.toBeNull();
      expect(navBox).not.toBeNull();

      const paddingBottom = await grid.evaluate((el) =>
        parseFloat(getComputedStyle(el).paddingBottom)
      );
      expect(gridBox.y + gridBox.height - paddingBottom).toBeLessThanOrEqual(
        navBox.y + ALLOWED_OFFSET
      );

      await page.screenshot({
        path: testInfo.outputPath("desktop-layout.png"),
        fullPage: true
      });
    });

    test("bottom navbar displays in a single row", async ({ page }) => {
      const tops = await page
        .locator(".bottom-navbar li")
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
      const maxTop = Math.max(...tops);
      const minTop = Math.min(...tops);
      expect(maxTop - minTop).toBeLessThanOrEqual(ALLOWED_OFFSET);
      await expect(page.locator(".bottom-navbar .nav-toggle")).toHaveCount(0);
    });
  });

  test.describe.parallel("mobile", () => {
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

      const grid = page.locator(".game-mode-grid");
      const gridBox = await grid.boundingBox();
      const navBox = await page.locator(".bottom-navbar").boundingBox();

      expect(gridBox).not.toBeNull();
      expect(navBox).not.toBeNull();

      const paddingBottom = await grid.evaluate((el) =>
        parseFloat(getComputedStyle(el).paddingBottom)
      );

      expect(gridBox.y + gridBox.height - paddingBottom).toBeLessThanOrEqual(
        navBox.y + ALLOWED_OFFSET
      );

      await page.screenshot({
        path: testInfo.outputPath("mobile-layout.png"),
        fullPage: true
      });
    });

    test("hamburger menu expands navigation", async ({ page }) => {
      await page.setViewportSize({ width: 400, height: 800 });
      await page.goto("/index.html");
      await page.waitForSelector(".bottom-navbar .nav-toggle");
      const toggle = page.locator(".bottom-navbar .nav-toggle");
      const list = page.locator(".bottom-navbar ul");
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(list).not.toHaveClass(/expanded/);
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(list).toHaveClass(/expanded/);
    });
  });
});
