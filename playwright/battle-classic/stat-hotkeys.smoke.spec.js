import { test, expect } from "../fixtures/commonSetup.js";

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

    const roundMessage = page.locator("header #round-message");
    const nextButton = page.getByTestId("next-button");

    await expect(roundMessage).toContainText(/You picked: \w+/, { timeout: 5000 });
    await expect(nextButton).toBeEnabled();
    await expect(nextButton).toHaveAttribute("data-next-ready", "true");
  });
});
