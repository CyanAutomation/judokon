import { test, expect } from "./fixtures/commonSetup.js";

const ALLOWED_OFFSET = 2;

test.describe("Homepage layout", () => {
  test.describe("desktop", () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/index.html");
      await page.locator('body[data-home-ready="true"]').waitFor();
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

    test("shows Settings tile", async ({ page }) => {
      const settingsLink = page.getByRole("link", { name: /open settings/i });
      await expect(settingsLink).toBeVisible();
      await expect(settingsLink).toHaveAttribute("href", "./src/pages/settings.html");

      await settingsLink.click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/src\/pages\/settings\.html$/);
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

      await page.goBack();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/index\.html$/);
      await page.locator('body[data-home-ready="true"]').waitFor();
    });
  });
});
