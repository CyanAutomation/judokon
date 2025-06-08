import { test, expect } from "@playwright/test";

test("homepage screenshot", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot("homepage.png");
});
