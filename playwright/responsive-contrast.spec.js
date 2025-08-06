import { test, expect } from "./fixtures/commonSetup.js";

test.describe.parallel("Responsive scenarios", () => {
  test("renders ultra-narrow layout without horizontal scroll", async ({ page }) => {
    await page.goto("/index.html", { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 260, height: 800 });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(260);
  });

  test("updates orientation on viewport rotation", async ({ page }) => {
    await page.goto("/src/pages/battleJudoka.html", { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 320, height: 480 });
    await page.waitForFunction(
      () => document.querySelector(".battle-header")?.dataset.orientation === "portrait"
    );
    await page.setViewportSize({ width: 480, height: 320 });
    await page.waitForFunction(
      () => document.querySelector(".battle-header")?.dataset.orientation === "landscape"
    );
  });

  test("toggles high-contrast display mode", async ({ page }) => {
    await page.goto("/src/pages/settings.html");
    await page.locator("#display-mode-high-contrast").waitFor();
    await page.check("#display-mode-high-contrast");
    await expect(page.locator("body")).toHaveAttribute("data-theme", "high-contrast");
  });
});
