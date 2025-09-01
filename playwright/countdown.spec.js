import { test, expect } from "@playwright/test";

// Quick countdown timing test: verify the atomic setCountdown updates data-remaining-time
// and visible text. Use page.evaluate to call the init helper directly.

test.describe("Battle CLI countdown timing", () => {
  test("setCountdown updates data-remaining-time each second", async ({ page }) => {
    const url = process.env.CLI_TEST_URL || "http://127.0.0.1:5000/src/pages/battleCLI.html";
    await page.goto(url);
    // Ensure the init helpers are available
    await expect(page.locator("#cli-countdown")).toHaveCount(1);
    // Call the helper to set countdown to 3 seconds and assert the atomic update
    await page.evaluate(() => {
      if (window.__battleCLIinit && typeof window.__battleCLIinit.setCountdown === "function") {
        window.__battleCLIinit.setCountdown(3);
      }
    });
    let remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
    expect(remaining).toBe("3");
    let text = await page.locator("#cli-countdown").innerText();
    expect(/3|03/.test(text)).toBeTruthy();

    // Simulate ticks by calling the helper again to 2 then 1
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.__battleCLIinit.setCountdown(2));
    remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
    expect(remaining).toBe("2");

    await page.waitForTimeout(1000);
    await page.evaluate(() => window.__battleCLIinit.setCountdown(1));
    remaining = await page.locator("#cli-countdown").getAttribute("data-remaining-time");
    expect(remaining).toBe("1");
  });
});
