import { test, expect } from "@playwright/test";

test.describe("Browse Judoka screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/carouselJudoka.html");
  });

  test("essential elements visible", async ({ page }) => {
    await expect(page.getByLabel("Filter judoka by country")).toBeVisible();
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: /battle!/i })).toBeVisible();
  });

  test("battle link navigates", async ({ page }) => {
    await page.getByRole("link", { name: /battle!/i }).click();
    await expect(page).toHaveURL(/battleJudoka\.html/);
  });

  test("logo has alt text", async ({ page }) => {
    const logo = page.locator(".logo-container img");
    await expect(logo).toHaveAttribute("alt", "JU-DO-KON! Logo");
  });

  test("scroll buttons have labels", async ({ page }) => {
    const left = page.locator(".scroll-button.left");
    const right = page.locator(".scroll-button.right");
    await expect(left).toHaveAttribute("aria-label", /scroll left/i);
    await expect(right).toHaveAttribute("aria-label", /scroll right/i);
  });
});
