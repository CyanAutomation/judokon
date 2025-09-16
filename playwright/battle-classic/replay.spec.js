import { test, expect } from "@playwright/test";

test.describe("Classic Battle replay", () => {
  test("Replay resets scoreboard after match end", async ({ page }) => {
    await page.addInitScript(() => {
      window.__FF_OVERRIDES = { showRoundSelectModal: true };
      localStorage.setItem("battle.pointsToWin", "1");
    });
    await page.goto("/src/pages/battleClassic.html");

    // Start match and click first stat to end quickly
    await page.getByRole("button", { name: "Medium" }).click();
    await page.getByTestId("stat-button").first().click();
    await expect(page.getByTestId("score-display")).toContainText(/You:\s*1/);

    // Click Replay and assert scores reset
    await page.getByTestId("replay-button").click();
    const score = page.getByTestId("score-display");
    await expect(score).toContainText(/You:\s*0/);
    await expect(score).toContainText(/Opponent:\s*0/);
  });
});
