import { test, expect } from "@playwright/test";

test.describe("Classic Battle quit flow", () => {
  test("Quit opens confirmation modal", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");
    await page.click("#quit-button");
    await expect(page.locator("#confirm-quit-button")).toBeVisible();
  });
});

