// Playwright smoke test: verifies inter-round cooldown auto-advances
import { test, expect } from "@playwright/test";

test.describe("Classic Battle – auto-advance", () => {
  test("shows countdown and auto-advances without Next", async ({ page }) => {
    await page.goto("/index.html");

    // Navigate to Classic Battle if needed
    let startBtn = await page.$('[data-testid="start-classic"]');
    if (startBtn) {
      await startBtn.click();
    } else {
      // Fallback: click by text selector
      startBtn = await page.getByText("Classic Battle").first();
      await startBtn.click();
    }

    // Wait for round to start
    const roundMsg = page.locator('#round-message, [data-testid="round-message"]');
    await expect(roundMsg).toBeVisible({ timeout: 10000 });

    // Simulate finishing a round via helper button if exposed, else rely on quick path
    const finishBtn = await page.$('[data-testid="test-finish-round"]');
    if (finishBtn) {
      await finishBtn.click();
    }

    // Expect a countdown snackbar to appear
    // Prefer specific countdown element to avoid strict mode violations
    const countdown = page.locator('[data-testid="next-round-timer"], #next-round-timer');
    await expect(countdown).toBeVisible({ timeout: 5000 });

    // Ensure Next is not clicked; wait for auto-advance by observing round message change
    const beforeText = (await roundMsg.textContent()) || "";
    await expect.poll(async () => (await roundMsg.textContent()) || "", {
      message: "expected round message to change after cooldown"
    }).not.toBe(beforeText);
  });
});
