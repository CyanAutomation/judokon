import { test, expect } from "@playwright/test";
import { withMutedConsole } from "../tests/utils/console.js";

// Improved countdown test using direct Test API access instead of waiting for timers

test.describe("Battle CLI countdown timing", () => {
  test("setCountdown updates data-remaining-time instantly via Test API", async ({ page }) =>
    withMutedConsole(async () => {
      const url = process.env.CLI_TEST_URL || "http://127.0.0.1:5000/src/pages/battleCLI.html";
      await page.goto(url);

      // Debug: Check what's available on window
      const windowProps = await page.evaluate(() => {
        return {
          hasTestAPI: typeof window.__TEST_API !== "undefined",
          hasBattleCLIInit: typeof window.__battleCLIinit !== "undefined",
          hasSetCountdown: typeof window.__battleCLIinit?.setCountdown === "function",
          testAPIProps: window.__TEST_API ? Object.keys(window.__TEST_API) : null,
          windowKeys: Object.keys(window).filter((k) => k.startsWith("__"))
        };
      });
      // console.log("Window props:", windowProps);

      // For now, fallback to the existing approach if Test API not available
      if (!windowProps.hasTestAPI && windowProps.hasSetCountdown) {
        // console.log("Test API not available, using legacy approach");

        // Ensure the countdown element exists
        await expect(page.locator("#cli-countdown")).toHaveCount(1);

        // Use legacy battleCLI init approach
        await page.evaluate(() => window.__battleCLIinit.setCountdown(3));

        let remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
        expect(remaining).toBe("3");

        await page.evaluate(() => window.__battleCLIinit.setCountdown(2));
        remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
        expect(remaining).toBe("2");

        await page.evaluate(() => window.__battleCLIinit.setCountdown(1));
        remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
        expect(remaining).toBe("1");

        return;
      }

      // Wait for Test API to be available
      await page.waitForFunction(() => window.__TEST_API !== undefined, { timeout: 5000 });

      // Ensure the countdown element exists
      await expect(page.locator("#cli-countdown")).toHaveCount(1);

      // Use Test API to set countdown - no waiting required!
      await page.evaluate(() => window.__TEST_API.timers.setCountdown(3));

      let remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
      expect(remaining).toBe("3");

      // Test countdown progression using Test API - instant updates!
      await page.evaluate(() => window.__TEST_API.timers.setCountdown(2));
      remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
      expect(remaining).toBe("2");

      await page.evaluate(() => window.__TEST_API.timers.setCountdown(1));
      remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
      expect(remaining).toBe("1");

      // Test countdown expiration
      await page.evaluate(() => window.__TEST_API.timers.setCountdown(0));
      remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
      expect(remaining).toBe("0");
    }, ["log", "warn", "error"]));
});
