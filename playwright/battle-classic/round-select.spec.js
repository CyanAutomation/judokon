import { test, expect } from "@playwright/test";

test.describe("Classic Battle round select", () => {
  test("choosing 15 marks target", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
    });

    await page.goto("/src/pages/battleClassic.html");

    // Wait for modal buttons and click the Long (id=3) option
    await page.locator("#round-select-3").click();

    // Expect body to mark selected target for testing
    await expect(page.locator("body")).toHaveAttribute("data-target", "15");
  });
});
