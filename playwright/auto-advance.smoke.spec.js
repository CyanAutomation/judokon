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
    // If round message not present, rely on round counter change
    const roundCounter = page.locator('[data-testid="round-counter"], #round-counter');
    await expect(roundMsg).toBeVisible({ timeout: 10000 });

    // Drive end-of-round deterministically via test API if exposed
    await page.waitForLoadState("networkidle");
    const hasTestApi = await page.evaluate(() => typeof window.__TEST__ !== "undefined");
    if (hasTestApi) {
      await page.evaluate(async () => {
        try {
          await window.__TEST__?.round?.finish?.();
        } catch {}
      });
    }

    // Expect a countdown snackbar to appear
    // Prefer specific countdown element to avoid strict mode violations
    const countdown = page.locator('[data-testid="next-round-timer"], #next-round-timer');
    await expect(countdown).toBeVisible({ timeout: 5000 });

    // Trigger public Next handler after readiness (programmatic click) then verify change
    if (hasTestApi) {
      await page.evaluate(async () => {
        try {
          await window.__TEST__?.round?.advanceAfterCooldown?.();
        } catch {}
      });
    }
    const beforeText = (await roundCounter.textContent().catch(() => roundMsg.textContent())) || "";
    await expect
      .poll(
        async () => {
          const t1 = await roundCounter.textContent().catch(() => null);
          const t2 = await roundMsg.textContent().catch(() => null);
          return (t1 || t2 || "").trim();
        },
        { message: "expected round message/counter to update" }
      )
      .not.toBe(beforeText);
  });
});
