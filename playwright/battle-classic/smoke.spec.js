import { test, expect } from "@playwright/test";

test.describe("Classic Battle page", () => {
  test("plays a full match and shows the end modal", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = {
        showRoundSelectModal: true
      };
    });

    page.on("console", (message) => {
      console.log("page console:", message.text());
    });

    await page.goto("/src/pages/battleClassic.html");

    // 1. Click the round select button for a quick match
    await page.locator('button:has-text("Quick")').click();

    await page.waitForTimeout(1000);

    console.log(
      "buttonsReady dataset:",
      await page.evaluate(() => document.querySelector("#stat-buttons")?.dataset.buttonsReady)
    );

    const getBattleState = () =>
      page.evaluate(() => document.body?.dataset?.battleState ?? "");

    // Play until the match ends
    for (let i = 0; i < 10; i++) {
      // Max 10 rounds to prevent infinite loop
      // 2. Wait for the stat buttons to be ready
      await page.waitForSelector('[data-buttons-ready="true"]');

      // 3. Click the first stat button
      await page.locator('[data-testid="stat-button"]').first().click();

      // Wait for the orchestrator to progress out of the selection state
      await expect.poll(getBattleState, { timeout: 15000 }).not.toBe("waitingForPlayerAction");

      const stateAfterResolution = await getBattleState();

      // Check if the end modal is visible after the round resolves
      const endModalVisible = await page.locator("#match-end-modal").isVisible();
      const terminalStates = new Set(["matchDecision", "matchSummary", "matchComplete"]);
      if (endModalVisible || terminalStates.has(stateAfterResolution)) {
        await expect(page.locator("#match-end-modal")).toBeVisible({ timeout: 15000 });
        break;
      }

      // Wait for the next round to become ready before continuing
      await expect.poll(getBattleState, { timeout: 15000 }).toBe("waitingForPlayerAction");
    }

    // Assert that the end modal is visible
    await expect(page.locator("#match-end-modal")).toBeVisible();

    // Assert that the showEndModal function incremented its structured counter
    const callCount = await page.evaluate(() => window.__classicBattleEndModalCount ?? 0);
    expect(callCount).toBeGreaterThan(0);
  });
});
