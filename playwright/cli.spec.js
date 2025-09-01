import { test, expect } from "@playwright/test";
test("CLI skeleton and helpers smoke", async ({ page }) => {
  // Use Playwright's static server (see baseURL/port 5000 in config)
  await page.goto("/src/pages/battleCLI.html");

  // stats container present (rows may be skeleton or populated, allow racing init)
  await expect(page.locator("#cli-stats")).toHaveCount(1);

  // countdown helper exposed on window
  const hasHelper = await page.waitForFunction(
    () => !!window.__battleCLIinit && typeof window.__battleCLIinit.setCountdown === "function"
  );
  expect(Boolean(await hasHelper.jsonValue())).toBe(true);

  // set countdown via helper and verify attribute/text
  await page.evaluate(() => window.__battleCLIinit.setCountdown(12));
  const cd = page.locator("#cli-countdown");
  await expect(cd).toHaveAttribute("data-remaining-time", "12");
  await expect(cd).toHaveText(/12/);

  // focus helpers
  await page.evaluate(() => window.__battleCLIinit.focusStats());
  await expect(page.locator("#cli-stats")).toBeFocused();
  await page.evaluate(() => window.__battleCLIinit.focusNextHint());
  await expect(page.locator("#cli-controls-hint")).toBeFocused();
});
