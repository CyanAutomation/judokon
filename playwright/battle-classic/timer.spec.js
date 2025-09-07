import { test, expect } from "@playwright/test";

test.describe("Classic Battle timer", () => {
  test("shows selection countdown after choosing rounds", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");
    await page.locator("#round-select-2").click();
    await expect(page.locator("#next-round-timer")).toContainText(/Time Left:/);
  });
});

