import { test, expect } from "@playwright/test";

test.describe("Quote screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/meditation.html");
  });

  test("elements are visible", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /full sweep achieved/i })).toBeVisible();
    await expect(page.getByAltText(/KG congratulates you/i)).toBeVisible();
    await expect(page.locator("#quote")).toBeVisible();
    await expect(page.getByRole("link", { name: /continue your journey/i })).toBeVisible();
  });

  test("continue button navigates home", async ({ page }) => {
    await page.getByRole("link", { name: /continue your journey/i }).click();
    await expect(page).toHaveURL(/index\.html/);
  });

  test("accessibility attributes present", async ({ page }) => {
    const quote = page.locator("#quote");
    await expect(quote).toHaveAttribute("aria-labelledby", "quote-heading");
    await expect(quote).toHaveAttribute("aria-describedby", "quote-content");
  });
});
