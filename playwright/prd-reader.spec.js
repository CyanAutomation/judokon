import { test, expect } from "@playwright/test";

test.describe("PRD Reader page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/prdReader.html");
  });

  test("forward and back navigation", async ({ page }) => {
    const container = page.locator("#prd-content");
    await expect(container).not.toHaveText("");
    const original = await container.innerHTML();

    await page.getByRole("button", { name: /next/i }).click();
    const afterNext = await page.locator("#prd-content").innerHTML();
    expect(afterNext).not.toBe(original);

    await page.getByRole("button", { name: /previous/i }).click();
    const afterPrev = await page.locator("#prd-content").innerHTML();
    expect(afterPrev).toBe(original);
  });
});
