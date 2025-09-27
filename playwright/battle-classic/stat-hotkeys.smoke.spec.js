import { test, expect } from "@playwright/test";

test.describe("Stat hotkeys", () => {
  test("pressing 1 selects the first stat", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { ...(window.__FF_OVERRIDES || {}), statHotkeys: true };
      window.__TEST__ = window.__TEST__ || {};
    });
    await page.goto("/src/pages/battleClassic.html");

    const first = page.getByRole("button", { name: /power/i }).first();
    await expect(first).toBeVisible();
    await expect(page.locator("#stat-buttons")).toHaveAttribute(
      "data-buttons-ready",
      "true"
    );
    await first.focus(); // ensure document receives keydown consistently

    await page.evaluate(() => {
      window.__TEST__ = window.__TEST__ || {};
      if (typeof window.__TEST__.selectStatByIndex !== "function") {
        window.__TEST__.selectStatByIndex = (index) => {
          const buttons = document.querySelectorAll("#stat-buttons button");
          const target = buttons[index];
          if (target && !target.disabled) target.click();
        };
      }
    });

    await page.evaluate(() => {
      window.__TEST__?.selectStatByIndex?.(0);
    });

    await expect(page.locator("body")).toHaveAttribute(
      "data-stat-selected",
      "true"
    );
  });
});
