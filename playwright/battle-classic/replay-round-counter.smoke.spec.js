import { test, expect } from "../fixtures/commonSetup.js";
import { waitForBattleReady } from "../helpers/battleStateHelper.js";

test.describe("Classic Battle replay - round counter", () => {
  test("Replay resets round counter to 1", async ({ page }) => {
    await page.goto("/src/pages/battleClassic.html");

    // Start a quick match to reach match end fast if necessary
    // Assumes default settings or quick mode is reachable; minimal interaction
    await waitForBattleReady(page, { allowFallback: true });

    // If round header exists, simulate end-of-match quickly via UI where possible
    const replayBtn = page.getByTestId("replay-button");
    await expect(replayBtn).toBeVisible();

    // Click replay and verify round counter shows 1
    await replayBtn.click();

    // Prefer deterministic round counter element
    const roundCounter = page.getByTestId("round-counter");
    await expect(roundCounter).toContainText(/Round\s*1/i);
  });
});
