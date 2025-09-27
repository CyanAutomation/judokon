import { test, expect } from "@playwright/test";

test.describe("Stat hotkeys", () => {
  test("pressing the 1 hotkey selects the first stat", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { ...(window.__FF_OVERRIDES || {}), statHotkeys: true };
    });
    await page.goto("/src/pages/battleClassic.html");

    const first = page.getByRole("button", { name: /power/i }).first();
    await expect(first).toBeVisible();
    await expect(page.locator("#stat-buttons")).toHaveAttribute("data-buttons-ready", "true");

    await page.locator("body").press("1");

    await expect(page.locator("body")).toHaveAttribute("data-stat-selected", "true");
  });
});
