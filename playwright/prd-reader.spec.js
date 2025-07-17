import { test, expect } from "@playwright/test";

test.describe("PRD Reader page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/prdViewer.html");
  });

  test("forward and back navigation", async ({ page }) => {
    const container = page.locator("#prd-content");
    let hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
    await expect(container).not.toHaveText("");
    const original = await container.innerHTML();

    await page.getByRole("banner").getByRole("button", { name: /next/i }).click();
    hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasOverflow).toBe(false);
    const afterNext = await page.locator("#prd-content").innerHTML();
    expect(afterNext).not.toBe(original);

    await page
      .getByRole("banner")
      .getByRole("button", { name: /previous/i })
      .click();
    const afterPrev = await page.locator("#prd-content").innerHTML();
    expect(afterPrev).toBe(original);
  });
});
