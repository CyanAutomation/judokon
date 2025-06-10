import { test, expect } from "@playwright/test";

test.describe("Battle Judoka page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html");
  });

  test("page loads", async ({ page }) => {
    await expect(page).toHaveTitle(/Ju-Do-Kon!/i);
  });

  test("essential elements visible", async ({ page }) => {
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("img", { name: "JU-DO-KON! Logo" })).toBeVisible();
    await expect(page.getByRole("link", { name: /view judoka/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /update judoka/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /classic battle/i })).toBeVisible();
  });

  test("navigation links work", async ({ page }) => {
    await page.getByRole("link", { name: /view judoka/i }).click();
    await expect(page).toHaveURL(/randomJudoka\.html/);
    await page.goBack();
    await page.getByRole("link", { name: /update judoka/i }).click();
    await expect(page).toHaveURL(/updateJudoka\.html/);
    await page.goBack();
    await page.getByRole("link", { name: /classic battle/i }).click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });
});
