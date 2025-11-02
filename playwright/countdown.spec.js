import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";
import { getCountdownValue, waitForCountdownValue } from "./helpers/timerHelper.js";

// Improved countdown test using direct Test API access instead of waiting for timers

test.describe("Battle CLI countdown timing", () => {
  test("setCountdown updates data-remaining-time instantly via Test API", async ({ page }) =>
    withMutedConsole(async () => {
      const url = process.env.CLI_TEST_URL || "http://127.0.0.1:5000/src/pages/battleCLI.html";
      await page.goto(url);

      // Wait for Test API to be available
      await page.waitForFunction(() => window.__TEST_API !== undefined, { timeout: 5000 });

      // Ensure the countdown element exists
      const countdownLocator = page.locator("#cli-countdown");
      await expect(countdownLocator).toHaveCount(1);

      const expectCountdownValue = async (value) => {
        const resolved = await waitForCountdownValue(page, value);
        expect(resolved).toBe(value);

        const apiValue = await getCountdownValue(page);
        expect(apiValue).toBe(value);

        const remaining = await countdownLocator.getAttribute("data-remaining-time");
        expect(remaining).toBe(String(value));
      };

      // Use Test API to set countdown - no waiting required!
      await page.evaluate(() => window.__TEST_API.timers.setCountdown(3));
      await expectCountdownValue(3);

      // Test countdown progression using Test API - instant updates!
      await page.evaluate(() => window.__TEST_API.timers.setCountdown(2));
      await expectCountdownValue(2);

      await page.evaluate(() => window.__TEST_API.timers.setCountdown(1));
      await expectCountdownValue(1);

      // Test countdown expiration
      await page.evaluate(() => window.__TEST_API.timers.setCountdown(0));
      await expectCountdownValue(0);
    }, ["log", "warn", "error"]));
});
