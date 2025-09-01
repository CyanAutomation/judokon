import { test, expect } from "@playwright/test";
import { resolve } from "path";

test("CLI skeleton and helpers smoke", async ({ page }) => {
  const file = "file://" + resolve(process.cwd(), "src/pages/battleCLI.html");
  await page.goto(file);

  // skeleton rows present
  const stats = await page.locator("#cli-stats .cli-stat.skeleton");
  await expect(stats.first()).toBeVisible();

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
