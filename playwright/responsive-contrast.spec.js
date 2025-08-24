import { test, expect } from "./fixtures/commonSetup.js";

test.describe.parallel("Responsive scenarios", () => {
  test("renders ultra-narrow layout without horizontal scroll", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 260, height: 800 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(260);
  });

  test("toggles high-contrast display mode", async ({ page }) => {
    await page.goto("/src/pages/settings.html");
    await page.waitForSelector("[data-settings-ready]");
    await page.check("#display-mode-high-contrast");
    await expect(page.locator("body")).toHaveAttribute("data-theme", "high-contrast");
  });
});
