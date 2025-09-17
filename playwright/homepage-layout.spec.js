import { test, expect } from "./fixtures/commonSetup.js";

const ALLOWED_OFFSET = 2;

test.describe("Homepage layout", () => {
  test.describe("desktop", () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

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

    test("home screen matches viewport height", async ({ page }) => {
      const heightDiff = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollHeight - window.innerHeight;
      });
      // .home-screen already includes header/footer padding
      expect(Math.abs(heightDiff)).toBeLessThanOrEqual(ALLOWED_OFFSET);
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
});
