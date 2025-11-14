import { test, expect } from "../fixtures/commonSetup.js";

test.describe("Classic Battle auto-advance", () => {
  test("after a round, cooldown completes and Next becomes ready", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");

    // Choose a stat to resolve a round quickly
    await page
      .getByRole("button", { name: /power|speed|technique|kumikata|newaza/i })
      .first()
      .click();

    // Wait for Next button to become enabled/ready
    const nextBtn = page.locator("#next-button");
    await expect(nextBtn).toHaveAttribute("data-next-ready", "true");
  });
});
