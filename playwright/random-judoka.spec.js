import { test, expect } from "@playwright/test";

test.describe("View Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/randomJudoka.html");
  });

  test("essential elements visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /draw card/i })).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("battle link navigates", async ({ page }) => {
    await page.getByRole("link", { name: /battle!/i }).click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });

  test("draw button has label", async ({ page }) => {
    const btn = page.getByRole("button", { name: /draw card/i });
    await expect(btn).toHaveAttribute("aria-label", /draw a random card/i);
  });
});
