import { test, expect } from "@playwright/test";

test.describe("Stat hotkeys", () => {
  test("clicking the first stat selects it", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { ...(window.__FF_OVERRIDES || {}), statHotkeys: true };
      window.__FEATURE_FLAGS__ = {
        ...(window.__FEATURE_FLAGS__ || {}),
        statHotkeys: true
      };
    });
    await page.goto("/src/pages/battleClassic.html");

    const first = page.getByRole("button", { name: /power/i }).first();
    await expect(first).toBeVisible();
    await expect(page.locator("#stat-buttons")).toHaveAttribute(
      "data-buttons-ready",
      "true"
    );

    await first.click();

    await expect(page.locator("body")).toHaveAttribute(
      "data-stat-selected",
      "true"
    );
  });
});
