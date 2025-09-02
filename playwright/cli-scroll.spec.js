import { test, expect } from "@playwright/test";

test("CLI layout has no horizontal scrollbar when content fits", async ({ page }) => {
  await page.goto("/src/pages/battleCLI.html");
  const hasHorizontalScroll = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth > el.clientWidth;
  });
  expect(hasHorizontalScroll).toBe(false);
});
