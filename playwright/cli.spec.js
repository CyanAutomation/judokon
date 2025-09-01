import { test, expect } from "@playwright/test";
test("CLI skeleton and helpers smoke", async ({ page }) => {
  // Use Playwright's static server (see baseURL/port 5000 in config)
  await page.goto("/src/pages/battleCLI.html");

  // skeleton or populated stat rows present (allow for fast fetch replacing skeletons)
  const skeleton = page.locator("#cli-stats .cli-stat.skeleton");
  const anyRow = page.locator("#cli-stats .cli-stat");
  await expect(page.locator("#cli-stats")).toHaveCount(1);
  const [sCount, anyCount] = await Promise.all([skeleton.count(), anyRow.count()]);
  expect(sCount > 0 || anyCount > 0).toBe(true);

  // countdown helper exposed on window
  const hasHelper = await page.evaluate(
    () => !!window.__battleCLIinit && typeof window.__battleCLIinit.setCountdown === "function"
  );
  expect(hasHelper).toBe(true);

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
