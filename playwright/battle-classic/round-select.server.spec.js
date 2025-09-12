import { test, expect } from "@playwright/test";

test.describe("Classic Battle round select (server)", () => {
  test("choosing 15 marks target", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });
    
    await page.goto("/src/pages/battleClassic.html");
    await page.locator("#round-select-3").click();
    await expect(page.locator("body")).toHaveAttribute("data-target", "15");
  });
});
