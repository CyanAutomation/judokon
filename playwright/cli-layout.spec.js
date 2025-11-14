import { test, expect } from "./fixtures/battleCliFixture.js";

test.describe("CLI layout", () => {
  test("should render core CLI sections", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");

    const cliRoot = page.locator('[data-test="cli-root"]');
    await expect(cliRoot).toBeVisible();

    const settings = page.locator("#cli-settings");
    await expect(settings).toHaveAttribute("open", "");

    const stats = page.locator("#cli-stats .cli-stat");
    await expect(stats).toHaveCount(5);

    await expect(page.locator("#cli-header")).toBeVisible();
    await expect(page.locator("#cli-controls-hint")).not.toBeVisible();
  });
});
