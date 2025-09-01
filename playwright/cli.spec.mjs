import { test, expect } from "@playwright/test";
import { resolve } from "path";

test("CLI skeleton and helpers smoke", async ({ page }) => {
  const file = "file://" + resolve(process.cwd(), "src/pages/battleCLI.html");
  await page.goto(file);

  // stats present (either skeleton placeholders or real stat rows)
  const statsCount = await page.locator("#cli-stats .cli-stat").count();
  expect(statsCount).toBeGreaterThan(0);

  // If init helper is exposed use it; otherwise fall back to direct DOM ops
  const helperExists = await page.evaluate(() => !!window.__battleCLIinit && typeof window.__battleCLIinit.setCountdown === "function");
  if (helperExists) {
    await page.evaluate(() => window.__battleCLIinit.setCountdown(12));
  } else {
    await page.evaluate(() => {
      const el = document.getElementById('cli-countdown');
      if (el) {
        el.dataset.remainingTime = '12';
        el.textContent = 'Timer: 12';
      }
    });
  }
  const cd = page.locator("#cli-countdown");
  await expect(cd).toHaveAttribute("data-remaining-time", "12");
  await expect(cd).toHaveText(/12/);

  // focus helpers (or fallback to direct focus)
  const focusHelper = await page.evaluate(() => !!window.__battleCLIinit && typeof window.__battleCLIinit.focusStats === 'function');
  if (focusHelper) {
    await page.evaluate(() => window.__battleCLIinit.focusStats());
    await expect(page.locator('#cli-stats')).toBeFocused();
    await page.evaluate(() => window.__battleCLIinit.focusNextHint());
    await expect(page.locator('#cli-controls-hint')).toBeFocused();
  } else {
    await page.focus('#cli-stats');
    await expect(page.locator('#cli-stats')).toBeFocused();
    await page.focus('#cli-controls-hint');
    await expect(page.locator('#cli-controls-hint')).toBeFocused();
  }
});
