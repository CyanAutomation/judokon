import { test, expect } from "@playwright/test";

const DEFAULT_CLI_URL = "http://127.0.0.1:5000/src/pages/battleCLI.html";

const buildCliUrl = () => {
  const url = process.env.CLI_TEST_URL ?? DEFAULT_CLI_URL;

  try {
    return new URL(url).toString();
  } catch (cause) {
    throw new Error(`Invalid CLI_TEST_URL: ${url}. Must be a valid URL.`, { cause });
  }
};

test("CLI skeleton and helpers smoke", async ({ page }) => {
  await page.goto(buildCliUrl());

  // stats container present (rows may be skeleton or populated, allow racing init)
  await expect(page.locator("#cli-stats")).toHaveCount(1);
  // skeleton placeholders ensure keyboard rows exist before data loads
  const statsCount = await page.locator("#cli-stats .cli-stat").count();
  expect(statsCount).toBeGreaterThan(0);

  // countdown helper exposed via Test API timers
  await page.waitForFunction(() => typeof window.__TEST_API?.timers?.setCountdown === "function", {
    timeout: 5000
  });

  // focus helpers continue to be exposed for keyboard interaction tests
  await page.waitForFunction(
    () =>
      typeof window.__battleCLIinit?.focusStats === "function" &&
      typeof window.__battleCLIinit?.focusNextHint === "function",
    { timeout: 5000 }
  );

  // set countdown via helper and verify attribute/text
  await page.evaluate(() => window.__TEST_API.timers.setCountdown(12));
  await page.waitForFunction(
    () => document.querySelector("#cli-countdown")?.getAttribute("data-remaining-time") === "12",
    { timeout: 5000 }
  );
  const cd = page.locator("#cli-countdown");
  await expect(cd).toHaveAttribute("data-remaining-time", "12");
  await expect(cd).toHaveText(/12/);

  // focus helpers remain exposed on the legacy helper for keyboard support checks
  // while the CLI slowly migrates remaining helpers to the centralized Test API
  await page.evaluate(() => window.__battleCLIinit.focusStats());
  await expect(page.locator("#cli-stats")).toBeFocused();
  await page.evaluate(() => window.__battleCLIinit.focusNextHint());
  await expect(page.locator("#cli-controls-hint")).toBeFocused();
});
