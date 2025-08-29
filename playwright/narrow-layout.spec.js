import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Responsive scenarios", () => {
  test("renders ultra-narrow layout without horizontal scroll", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 260, height: 800 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(260);
  });
});
