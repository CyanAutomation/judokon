import { test, expect } from "./fixtures/commonSetup.js";

const ALLOWED_OFFSET = 2;

test.describe("Homepage layout", () => {
  test.describe("desktop", () => {
    test.use({ viewport: { width: 1024, height: 800 } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/index.html");
      await page.locator('body[data-home-ready="true"]').waitFor();
      await page.evaluate(() => window.navReadyPromise);
    });

    test("grid has two columns", async ({ page }) => {
      const columnCount = await page.evaluate(() => {
        const style = getComputedStyle(document.querySelector(".game-mode-grid"));
        return style.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
      });
      expect(columnCount).toBe(2);
    });

    test("grid does not overlap footer (desktop)", async ({ page }) => {
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

  test.describe("mobile", () => {
    test.use({ viewport: { width: 500, height: 800 } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/index.html");
      await page.locator('body[data-home-ready="true"]').waitFor();
      await page.evaluate(() => window.navReadyPromise);
    });

    test("grid has one column", async ({ page }) => {
      const columnCount = await page.evaluate(() => {
        const style = getComputedStyle(document.querySelector(".game-mode-grid"));
        return style.gridTemplateColumns.split(/\s+/).filter(Boolean).length;
      });
      expect(columnCount).toBe(1);
    });

    test("grid does not overlap footer (mobile)", async ({ page }) => {
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
    });
  });
});
