import { test, expect } from "@playwright/test";

// Improved countdown test using direct Test API access instead of waiting for timers

test.describe("Battle CLI countdown timing", () => {
  test("setCountdown updates data-remaining-time instantly via Test API", async ({ page }) => {
    const url = process.env.CLI_TEST_URL || "http://127.0.0.1:5000/src/pages/battleCLI.html";
    await page.goto(url);

    // Wait for Test API to be available
    await page.waitForFunction(() => window.__TEST_API !== undefined);

    // Ensure the countdown element exists
    await expect(page.locator("#cli-countdown")).toHaveCount(1);

    // Use Test API to set countdown to 3 seconds - no waiting required!
    await page.evaluate(() => window.__TEST_API.timers.setCountdown(3));

    let remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
    expect(remaining).toBe("3");
    let text = await page.locator("#cli-countdown").innerText();
    expect(/3|03/.test(text)).toBeTruthy();

    // Test countdown progression using Test API - instant updates, no timeouts!
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
  });
});
