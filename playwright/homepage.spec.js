import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/index.html");
  });

  test("page loads", async ({ page }) => {
    await expect(page).toHaveTitle(/Ju-Do-Kon!/i);
  });

  test("logo has alt text", async ({ page }) => {
    const logo = page.getByRole("img", { name: "JU-DO-KON! Logo" });
    await expect(logo).toHaveAttribute("alt", "JU-DO-KON! Logo");
  });

  test("navigation links visible", async ({ page }) => {
    await page.waitForSelector(".bottom-navbar a");
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("link", { name: /view judoka/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /classic battle/i })).toBeVisible();
  });

  test("footer navigation links present", async ({ page }) => {
    const footerLinks = page.locator("footer .bottom-navbar a");
    await expect(footerLinks).not.toHaveCount(0);
  });

  test("view judoka link navigates", async ({ page }) => {
    await page.getByRole("link", { name: /view all judoka/i }).click();
    await expect(page).toHaveURL(/carouselJudoka\.html/);
  });
});
