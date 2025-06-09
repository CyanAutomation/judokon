import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("navigation links visible", async ({ page }) => {
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: /view all judoka/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /classic battle/i })).toBeVisible();
  });

  test("view judoka link navigates", async ({ page }) => {
    await page.getByRole("link", { name: /view all judoka/i }).click();
    await expect(page).toHaveURL(/randomJudoka\.html/);
  });
});
